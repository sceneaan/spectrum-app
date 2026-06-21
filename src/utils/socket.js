import { io } from 'socket.io-client';
import config from '../config/environment';
import EncryptedStorage from 'react-native-encrypted-storage';
import { DeviceEventEmitter } from 'react-native';

class SocketService {
	constructor() {
		this.socket = null;
		this.userId = null;
		this.currentRoom = null;
	}

	async connect(userId) {
		this.userId = userId;

		// If already connected with same user, resolve immediately
		if (this.socket && this.socket.connected) {
			// Re-emit join to ensure user is registered
			this.socket.emit('join', userId);
			return Promise.resolve();
		}

		if (this.socket && !this.socket.connected) {
			this.socket.removeAllListeners();
			this.socket = null;
		}

		// Get token from storage for authentication
		let token = null;
		try {
			const authStorageJson = await EncryptedStorage.getItem('auth-storage');
			if (authStorageJson) {
				const authStorage = JSON.parse(authStorageJson);
				token = authStorage?.state?.token;
			}
		} catch (error) {
			console.warn('Failed to get token for socket auth:', error);
		}

		// Return a Promise that resolves when socket is connected
		return new Promise((resolve, reject) => {
			this.socket = io(config.file_url, {
				withCredentials: true,
				reconnection: true,
				reconnectionAttempts: 10,           // Increased from 5 for better reliability
				reconnectionDelay: 500,             // Start with faster retry (was 1000)
				reconnectionDelayMax: 5000,         // Cap max delay at 5 seconds
				randomizationFactor: 0.5,           // Add jitter to prevent thundering herd
				timeout: 15000,                     // Connection timeout
				// SECURITY: Pass JWT token for socket authentication
				auth: {
					token: token,
				},
			});

			// Set a timeout for connection
			const connectionTimeout = setTimeout(() => {
				console.warn('[Socket] Connection timeout');
				reject(new Error('Socket connection timeout'));
			}, 20000); // 20 second timeout (allows for socket.io retries)

			this.socket.on('connect', () => {
				console.log('[Socket] Connected successfully');
				clearTimeout(connectionTimeout);
				this.socket.emit('join', userId);

				// Rejoin room if we were in one
				if (this.currentRoom) {
					this.socket.emit('joinRoom', this.currentRoom);
				}

				resolve();
			});

			this.socket.on('reconnect', (attemptNumber) => {
				console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
				this.socket.emit('join', userId);

				// Rejoin room on reconnect
				if (this.currentRoom) {
					this.socket.emit('joinRoom', this.currentRoom);
				}
			});

			this.socket.on('newMessage', (message) => {
				console.log('[Socket] New message received:', message?.thread || message?._id);
				// Emit event for screens to handle
				DeviceEventEmitter.emit('socket:newMessage', message);
			});

			this.socket.on('disconnect', (reason) => {
				console.log('[Socket] Disconnected:', reason);
			});

			this.socket.on('connect_error', (error) => {
				console.warn('[Socket] Connection error:', error.message);
				clearTimeout(connectionTimeout);

				// Handle authentication errors
				if (error.message === 'Authentication error' || error.message === 'Account is inactive') {
					console.warn('[Socket] Authentication failed');
					DeviceEventEmitter.emit('socket:authError', { message: error.message });
					this.disconnect();
					reject(error);
				}
			});

			// Handle custom error events from server
			this.socket.on('error', (errorData) => {
				console.warn('[Socket] Error from server:', errorData?.message || errorData);
				if (errorData?.message === 'Authentication required to join room' ||
					errorData?.message === 'You do not have access to this room') {
					DeviceEventEmitter.emit('socket:accessDenied', errorData);
				}
			});

			// Handle force logout when user logs in from another device
			this.socket.on('forceLogout', (data) => {
				console.log('[Socket] Force logout received - logged in elsewhere');
				DeviceEventEmitter.emit('socket:forceLogout', data);
				this.disconnect();
			});
		});
	}

	// Update token for reconnection (call after token refresh)
	async updateToken() {
		try {
			const authStorageJson = await EncryptedStorage.getItem('auth-storage');
			if (authStorageJson && this.socket) {
				const authStorage = JSON.parse(authStorageJson);
				const token = authStorage?.state?.token;
				if (token) {
					this.socket.auth = { token };
					// If disconnected, reconnect with new token
					if (!this.socket.connected) {
						this.socket.connect();
					}
				}
			}
		} catch (error) {
			console.warn('Failed to update socket token:', error);
		}
	}

	joinRoom(roomId) {
		this.currentRoom = roomId;
		if (this.socket && this.socket.connected) {
			this.socket.emit('joinRoom', roomId);
		}
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
	}
}

const socketService = new SocketService();
export default socketService;