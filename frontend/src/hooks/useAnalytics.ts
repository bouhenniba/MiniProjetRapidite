import { useState, useEffect } from 'react';
import type { OLAPRecord, APIResponse, Dimensions, DimensionLevel } from '../types/analytics.types';
import { API_BASE_URL } from '../constants/analytics.constants';

export const useAnalytics = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [olapData, setOlapData] = useState<OLAPRecord[]>([]);
    const [dimensionColumns, setDimensionColumns] = useState<string[]>([]);
    const [filters, setFilters] = useState<Record<string, string>>({});

    const [dimensions, setDimensions] = useState<Dimensions>({
        temp: 'year+month' as DimensionLevel,
        clie: 'pays+client' as DimensionLevel,
        emp: 'DEPARTEMENT+EMPLOYE' as DimensionLevel,
        prod: 'categorie+produit' as DimensionLevel
    });

    const fetchOLAPData = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...dimensions, filters })
            });

            const result: APIResponse = await response.json();

            if (result.success) {
                const parsedData = result.data.map(rec => {
                    const newRec = { ...rec };
                    ['nombre_commandes', 'moyenne_retard', 'total_retard', 'min_retard',
                        'max_retard', 'moy_prevue', 'moy_reelle', 'ecart_moyen'].forEach(m => {
                            if (newRec[m] !== undefined && newRec[m] !== null) {
                                newRec[m] = Number(newRec[m]);
                            }
                        });
                    return newRec;
                });

                setOlapData(parsedData);
                setDimensionColumns(result.metadata.dimension_columns);
            } else {
                setError(result.error || 'Unknown error');
                console.error('API Error:', result.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error');
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateDimension = (key: keyof Dimensions, val: DimensionLevel) => {
        const nextDimensions = { ...dimensions, [key]: val };
        const allCount = Object.values(nextDimensions).filter(v => v === 'ALL').length;

        if (allCount === 4) {
            setError("Cannot select 'ALL' for all dimensions simultaneously.");
            return;
        }

        setError(null);
        setDimensions(nextDimensions);
    };

    const resetFilters = () => {
        setDimensions({
            temp: 'year',
            clie: 'ALL',
            emp: 'ALL',
            prod: 'ALL'
        });
        setFilters({});
    };

    useEffect(() => {
        fetchOLAPData();
    }, [dimensions, filters]);

    return {
        loading,
        error,
        olapData,
        dimensionColumns,
        dimensions,
        filters,
        setFilters,
        updateDimension,
        resetFilters,
        fetchOLAPData
    };
};
