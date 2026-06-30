import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useGetSearchFilters, useSearchProviders } from '../api/services/Search.Service';

const INITIAL_FILTERS = {
    search: '',
    gender: '',
    issues: [],
    ageGroups: [],
    approaches: [],
    sessionTypes: [],
    languages: [],
    priceMin: '',
    priceMax: '',
    days: [],
    timeSlot: '',
    sort: '',
    page: 1,
};

export function useProviderSearch(initialFilters = {}) {
    const [filters, setFilters] = useState({ ...INITIAL_FILTERS, ...initialFilters });
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debounceTimer = useRef(null);

    // Debounce search text (300ms)
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setDebouncedSearch(filters.search);
        }, 300);
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [filters.search]);

    // Build API query from filters
    const apiQuery = useMemo(() => {
        const query = {};
        if (debouncedSearch) query.search = debouncedSearch;
        if (filters.gender) query.gender = filters.gender;
        if (filters.issues.length) query.issues = filters.issues;
        if (filters.ageGroups.length) query.ageGroups = filters.ageGroups;
        if (filters.approaches.length) query.approaches = filters.approaches;
        if (filters.sessionTypes.length) query.sessionTypes = filters.sessionTypes;
        if (filters.languages.length) query.languages = filters.languages;
        if (filters.priceMin) query.priceMin = filters.priceMin;
        if (filters.priceMax) query.priceMax = filters.priceMax;
        if (filters.days.length) query.days = filters.days;
        if (filters.timeSlot) query.timeSlot = filters.timeSlot;
        if (filters.sort) query.sort = filters.sort;
        if (filters.page > 1) query.page = filters.page;
        return query;
    }, [debouncedSearch, filters.gender, filters.issues, filters.ageGroups, filters.approaches, filters.sessionTypes, filters.languages, filters.priceMin, filters.priceMax, filters.days, filters.timeSlot, filters.sort, filters.page]);

    // API calls
    const { data: filterOptions, isLoading: filtersLoading } = useGetSearchFilters();
    const { data: searchResult, isLoading: loading, isError, error, refetch } = useSearchProviders(apiQuery);

    const providers = searchResult?.providers || searchResult || [];
    const pagination = searchResult?.pagination || { page: filters.page, totalPages: 1, total: providers.length };

    // Update filters (merges partial, resets page to 1)
    const updateFilters = useCallback((partial) => {
        setFilters(prev => ({
            ...prev,
            ...partial,
            page: partial.page !== undefined ? partial.page : 1,
        }));
    }, []);

    // Clear all filters
    const clearFilters = useCallback(() => {
        setFilters(INITIAL_FILTERS);
    }, []);

    // Remove a single value from an array filter or clear a scalar filter
    const removeFilter = useCallback((key, value) => {
        setFilters(prev => {
            const current = prev[key];
            if (Array.isArray(current)) {
                return { ...prev, [key]: current.filter(v => v !== value), page: 1 };
            }
            return { ...prev, [key]: '', page: 1 };
        });
    }, []);

    // Computed values
    const hasActiveFilters = useMemo(() => {
        return filters.search !== '' ||
            filters.gender !== '' ||
            filters.issues.length > 0 ||
            filters.ageGroups.length > 0 ||
            filters.approaches.length > 0 ||
            filters.sessionTypes.length > 0 ||
            filters.languages.length > 0 ||
            filters.priceMin !== '' ||
            filters.priceMax !== '' ||
            filters.days.length > 0 ||
            filters.timeSlot !== '';
    }, [filters]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.gender) count++;
        count += filters.issues.length;
        count += filters.ageGroups.length;
        count += filters.approaches.length;
        count += filters.sessionTypes.length;
        count += filters.languages.length;
        if (filters.priceMin || filters.priceMax) count++;
        count += filters.days.length;
        if (filters.timeSlot) count++;
        return count;
    }, [filters]);

    return {
        providers,
        filterOptions: filterOptions || {},
        filters,
        loading,
        filtersLoading,
        isError,
        error,
        refetch,
        pagination,
        updateFilters,
        clearFilters,
        removeFilter,
        hasActiveFilters,
        activeFilterCount,
    };
}
