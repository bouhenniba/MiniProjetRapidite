import type { DimensionLevel, OLAPRecord, MeasureKey } from '../types/analytics.types';
import { COLUMN_TO_DIMENSION, HIERARCHIES, MEASURE_LABELS } from '../constants/analytics.constants';

export const resolveColumn = (colName: string, keys: string[]) => {
    if (!colName) return '';
    const norm = colName.toLowerCase();

    // Exact match
    let match = keys.find(k => k.toLowerCase() === norm);
    if (match) return match;

    // Fuzzy match with aliases
    const aliases: Record<string, string[]> = {
        year: ['annee', 'year', 'yr', 'an', 'date_id'],
        month: ['mois', 'month', 'mon', 'month_id'],
        saison: ['season', 'sais', 'trimestre'],
        week: ['semaine'],
        day: ['jour'],
        client: ['cli_nom', 'customer'],
        product: ['produit', 'libelle_produit'],
        country: ['pays']
    };

    if (aliases[norm]) {
        match = keys.find(k => {
            const lowerK = k.toLowerCase();
            return aliases[norm].some(a => lowerK === a || lowerK.includes(a));
        });
        if (match) return match;
    }

    // Partial inclusion
    match = keys.find(k => k.toLowerCase().includes(norm));
    if (match) return match;

    return colName;
};

export const getDimensionLabel = (slug: string) => {
    if (!slug) return 'Select...';

    const s = String(slug).toLowerCase();
    const specificMapping: Record<string, string> = {
        'year': 'Year', 'annee': 'Year',
        'month': 'Month', 'mois': 'Month',
        'saison': 'Season',
        'categorie': 'Category', 'produit': 'Product', 'fournisseur': 'Supplier',
        'client': 'Client', 'pays': 'Country',
        'employe': 'Employee', 'departement': 'Department',
        'all': 'All'
    };

    if (specificMapping[s]) return specificMapping[s];
    if (specificMapping[slug]) return specificMapping[slug];

    const dimKey = COLUMN_TO_DIMENSION[slug];
    const mapping: Record<string, string> = {
        temp: 'Time',
        prod: 'Product',
        clie: 'Client',
        emp: 'Staff'
    };

    return mapping[dimKey] || mapping[slug] || String(slug).toUpperCase();
};

export const getHierarchyForDim = (dimKey: string, dimVal: string): DimensionLevel[] => {
    if (dimKey === 'prod') {
        if (['categorie', 'categorie+produit'].includes(dimVal))
            return ['ALL', 'categorie', 'categorie+produit'];
        if (['fournisseur', 'fournisseur+produit'].includes(dimVal))
            return ['ALL', 'fournisseur', 'fournisseur+produit'];
        if (dimVal === 'ALL')
            return ['ALL', 'categorie', 'categorie+produit'];
        return [dimVal as DimensionLevel];
    }
    return HIERARCHIES[dimKey] || [];
};

export const getExtremeRecords = (
    data: OLAPRecord[],
    measure: MeasureKey,
    type: 'min' | 'max',
    count: number = 3
): OLAPRecord[] => {
    if (!data.length) return [];
    const sorted = [...data].sort((a, b) => {
        const valA = Number(a[measure]) || 0;
        const valB = Number(b[measure]) || 0;
        return type === 'max' ? valB - valA : valA - valB;
    });
    return sorted.slice(0, count);
};

export const generateInsightText = (
    rec: OLAPRecord,
    type: 'good' | 'bad',
    dimensionColumns: string[]
) => {
    const name = rec[dimensionColumns.find(c => c !== 'month' && c !== 'year') || dimensionColumns[0]] || 'Entity';
    if (type === 'bad')
        return `${name} is causing significant delays (Total: ${rec.total_retard}d).`;
    return `${name} is performing exceptionally well with minimal delay.`;
};

export const formatValueForExport = (val: any, clean: boolean = false): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') {
        if (clean && !Number.isInteger(val)) return val.toFixed(2);
        return String(val);
    }
    return String(val);
};

export const getExportHeaders = (data: OLAPRecord[], clean: boolean = false): string[] => {
    if (!data.length) return [];
    const keys = Object.keys(data[0]);
    if (!clean) return keys;

    return keys.map(key => {
        // Check if it's a measure
        if (MEASURE_LABELS[key as MeasureKey]) return MEASURE_LABELS[key as MeasureKey];
        // Otherwise it's likely a dimension
        return getDimensionLabel(key);
    });
};

export const exportToCSV = (data: OLAPRecord[], clean: boolean = false) => {
    if (!data.length) return;

    const keys = Object.keys(data[0]);
    const headers = getExportHeaders(data, clean);

    const rows = data.map(row =>
        keys.map(k => {
            const val = formatValueForExport(row[k], clean);
            return `"${val.replace(/"/g, '""')}"`;
        }).join(',')
    ).join('\n');

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(',') + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.setAttribute("download", `analytics_export_${clean ? 'clean_' : 'raw_'}${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const copyToClipboard = async (data: OLAPRecord[], clean: boolean = true) => {
    if (!data.length) return false;

    const keys = Object.keys(data[0]);
    const headers = getExportHeaders(data, clean);

    const rows = data.map(row =>
        keys.map(k => formatValueForExport(row[k], clean)).join('\t')
    ).join('\n');

    const content = headers.join('\t') + "\n" + rows;

    try {
        await navigator.clipboard.writeText(content);
        return true;
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        return false;
    }
};
