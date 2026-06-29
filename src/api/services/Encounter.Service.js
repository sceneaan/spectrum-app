import { useQuery } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { getRequest, postRequest, putRequest } from '@api';
import { throwServerError } from '@api/messages/error';
import { ErrorMessages } from '@api/messages/generic';
import { useAuthStore } from '../../store/authStore';

const MODEL_NAME = '/encounter';

// Create an encounter
export async function CreateEncounter(payload) {
    try {
        const result = await postRequest(`${MODEL_NAME}/create`, payload);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

// Get encounter details
export async function GetEncounterDetails(id) {
    try {
        const result = await getRequest(`${MODEL_NAME}/details/${id}`);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

// Update an encounter
export async function UpdateEncounter(payload) {
    try {
        const result = await putRequest(`${MODEL_NAME}/update`, payload);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

// Close an encounter
export async function CloseEncounter(payload) {
    try {
        const result = await postRequest(`${MODEL_NAME}/close`, payload);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

// List encounters
export async function ListEncounters(id) {
    try {
        const result = await getRequest(`${MODEL_NAME}/list/${id}`);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

// List previous prescriptions
export async function ListPreviousPrescription(id) {
    try {
        const result = await getRequest(`${MODEL_NAME}/list/prescription/${id}`);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

// List prescriptions by patient
export async function ListPrescriptionByPatient() {
    try {
        const result = await getRequest(`${MODEL_NAME}/list/my/prescription`);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

// React Query hook for listing prescriptions by patient
export function useListPrescriptionByPatient() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    return useQuery({
        queryKey: ['prescriptions', 'patient'],
        queryFn: async () => {
            return await ListPrescriptionByPatient();
        },
        enabled: isAuthenticated,
    });
}

// List encounters (provider — all open encounters)
export async function ListProviderEncounters(query) {
    try {
        const result = await getRequest(`${MODEL_NAME}/all`, query);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        }
        throw new Error(ErrorMessages.generalMessage);
    } catch (err) {
        return throwServerError(err);
    }
}

export function useGetEncounterDetails(encounterId) {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isProvider = user?.role?.toLowerCase() === 'provider';

    return useQuery({
        queryKey: ['encounterDetails', encounterId],
        queryFn: async () => GetEncounterDetails(encounterId),
        enabled: isAuthenticated && isProvider && Boolean(encounterId),
    });
}

export function useGetProviderEncountersAll(query = { page: 1, limit: 20 }) {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isProvider = user?.role?.toLowerCase() === 'provider';

    return useQuery({
        queryKey: ['providerEncountersAll', query],
        queryFn: async () => ListProviderEncounters(query),
        enabled: isAuthenticated && isProvider,
    });
}

// List sick leaves by patient
export async function ListSickLeaves() {
    try {
        const result = await getRequest(`${MODEL_NAME}/list/my/sick-leave-notes`);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

// List all procedures by patient
export async function ListProcedureRequestByPatient() {
    try {
        const result = await getRequest(`${MODEL_NAME}/list/my/procedures`);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

// Create a refill request
export async function CreateRefillRequest(payload) {
    try {
        const result = await postRequest(`${MODEL_NAME}/request/refill`, payload);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

// Adjust an existing drug
export async function AdjustExistingDrug(payload) {
    try {
        const result = await putRequest(`${MODEL_NAME}/adjust/drug`, payload);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

// List refill requests
export async function ListRefillRequest(query) {
    try {
        const result = await getRequest(`${MODEL_NAME}/list/refill/requests`, query);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}


// Get the latest follow-up
export async function GetLatestFollowUp(id) {
    try {
        const result = await getRequest(`${MODEL_NAME}/latest/follow-up/${id}`);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}

// Get the latest psychotherapy session
export async function GetLatestPsychotherapy(id) {
    try {
        const result = await getRequest(`${MODEL_NAME}/latest/psychotherapy/${id}`);
        if (result.status === HttpStatusCode.Ok) {
            return result.data.data;
        } else {
            throw new Error(ErrorMessages.generalMessage);
        }
    } catch (err) {
        return throwServerError(err);
    }
}
