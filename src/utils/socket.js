import { io } from 'socket.io-client';
import config from '../config/environment';
import EncryptedStorage from 'react-native-encrypted-storage';
import { DeviceEventEmitter } from 'react-native';
import { useAuthStore } from '../store/authStore';

class SocketService {
	constructor() {
		this.socket = null;
		this.userId = null;
		this.currentRoom = null;
		this.guestToken = null;
		this.guestName = null;
	}

	async _resolveAuthToken() {
		const storeToken = useAuthStore.getState().token;
		if (storeToken) return storeToken;

		try {
			const authStorageJson = await EncryptedStorage.getItem('auth-storage');
			if (authStorageJson) {
				const authStorage = JSON.parse(authStorageJson);
				return authStorage?.state?.token || null;
			}
		} catch (error) {
			console.warn('Failed to get token for socket auth:', error);
		}
		return null;
	}

	_setupSocketHandlers(resolve, reject, connectionTimeout) {
		this.socket.on('connect', () => {
			console.log('[Socket] Connected successfully');
			clearTimeout(connectionTimeout);

			if (this.userId) {
				this.socket.emit('join', this.userId);
			}

			if (this.currentRoom) {
				this._emitJoinRoom(this.currentRoom);
			}

			DeviceEventEmitter.emit('socket:connected');
			resolve();
		});

		this.socket.on('reconnect', (attemptNumber) => {
			console.log('[Socket] Reconnected after', attemptNumber, 'attempts');

			if (this.userId) {
				this.socket.emit('join', this.userId);
			}

			if (this.currentRoom) {
				this._emitJoinRoom(this.currentRoom);
			}

			DeviceEventEmitter.emit('socket:connected');
		});

		this.socket.on('newMessage', (message) => {
			DeviceEventEmitter.emit('socket:newMessage', message);
		});

		this.socket.on('clinicBookingCreated', (payload) => {
			DeviceEventEmitter.emit('socket:clinicBookingCreated', payload);
		});

		this.socket.on('disconnect', (reason) => {
			console.log('[Socket] Disconnected:', reason);
		});

		this.socket.on('connect_error', (error) => {
			console.warn('[Socket] Connection error:', error.message);
			clearTimeout(connectionTimeout);

			if (error.message === 'Authentication error' || error.message === 'Account is inactive') {
				console.warn('[Socket] Authentication failed');
				DeviceEventEmitter.emit('socket:authError', { message: error.message });
				this.disconnect();
				reject(error);
			}
		});

		this.socket.on('error', (errorData) => {
			console.warn('[Socket] Error from server:', errorData?.message || errorData);
			if (errorData?.message === 'Authentication required to join room' ||
				errorData?.message === 'You do not have access to this room') {
				DeviceEventEmitter.emit('socket:accessDenied', errorData);
			}
		});

		this.socket.on('forceLogout', (data) => {
			console.log('[Socket] Force logout received - logged in elsewhere');
			DeviceEventEmitter.emit('socket:forceLogout', data);
			this.disconnect();
		});
	}

	_emitJoinRoom(roomId) {
		if (!this.socket?.connected) return;

		if (this.guestToken && this.guestName) {
			this.socket.emit('joinRoom', { roomId, guestName: this.guestName });
		} else {
			this.socket.emit('joinRoom', roomId);
		}
	}

	async connect(userId) {
		this.userId = userId;
		this.guestToken = null;
		this.guestName = null;

		if (this.socket && this.socket.connected) {
			this.socket.emit('join', userId);
			return Promise.resolve();
		}

		if (this.socket && !this.socket.connected) {
			this.socket.removeAllListeners();
			this.socket = null;
		}

		const token = await this._resolveAuthToken();

		return new Promise((resolve, reject) => {
			this.socket = io(config.file_url, {
				withCredentials: true,
				reconnection: true,
				reconnectionAttempts: 10,
				reconnectionDelay: 500,
				reconnectionDelayMax: 5000,
				randomizationFactor: 0.5,
				timeout: 15000,
				auth: { token },
			});

			const connectionTimeout = setTimeout(() => {
				console.warn('[Socket] Connection timeout');
				reject(new Error('Socket connection timeout'));
			}, 20000);

			this._setupSocketHandlers(resolve, reject, connectionTimeout);
		});
	}

	connectAsGuest(guestToken, guestName = 'Guest') {
		if (this.socket?.connected || this.socket?.connecting) {
			this.disconnect();
		}

		this.userId = null;
		this.guestToken = guestToken;
		this.guestName = guestName;

		return new Promise((resolve, reject) => {
			this.socket = io(config.file_url, {
				withCredentials: true,
				reconnection: true,
				reconnectionAttempts: 10,
				reconnectionDelay: 500,
				reconnectionDelayMax: 5000,
				randomizationFactor: 0.5,
				timeout: 15000,
				auth: { guestToken },
			});

			const connectionTimeout = setTimeout(() => {
				console.warn('[Socket] Guest connection timeout');
				reject(new Error('Socket connection timeout'));
			}, 20000);

			this._setupSocketHandlers(resolve, reject, connectionTimeout);
		});
	}

	isGuest() {
		return !!this.guestToken;
	}

	updateToken() {
		const token = useAuthStore.getState().token;
		if (!token || !this.socket || this.guestToken) return Promise.resolve();

		this.socket.auth = { token };
		if (!this.socket.connected) {
			this.socket.connect();
		}
		return Promise.resolve();
	}

	joinRoom(roomId, guestName = null) {
		this.currentRoom = roomId;
		if (guestName) {
			this.guestName = guestName;
		}
		this._emitJoinRoom(roomId);
	}

	leaveRoom(roomId) {
		if (this.currentRoom === roomId) {
			this.currentRoom = null;
		}
		if (this.socket && this.socket.connected) {
			this.socket.emit('leaveRoom', roomId);
		}
	}

	sendMessage(event, data) {
		if (this.socket && this.socket.connected) {
			this.socket.emit(event, data);
		}
	}

	on(event, callback) {
		if (this.socket) {
			this.socket.on(event, callback);
		}
	}

	off(event, callback) {
		if (this.socket) {
			this.socket.off(event, callback);
		}
	}

	isConnected() {
		return this.socket && this.socket.connected;
	}

	disconnect() {
		if (this.socket) {
			this.socket.removeAllListeners();
			this.socket.disconnect();
			this.socket = null;
		}
		this.userId = null;
		this.currentRoom = null;
		this.guestToken = null;
		this.guestName = null;
	}
}

const socketService = new SocketService();
export default socketService;
