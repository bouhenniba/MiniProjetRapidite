import type { DimensionLevel, OLAPRecord, MeasureKey } from '../types/analytics.types';
import { COLUMN_TO_DIMENSION, HIERARCHIES, MEASURE_LABELS } from '../constants/analytics.constants';

export const resolveColumn = (colName: string, keys: string[]) => {
    if (!colName) return '';
    const norm = colName.toLowerCase();
    const lowerKeys = keys.map(k => k.toLowerCase());

    // 1. Exact match (case-insensitive)
    const exactIdx = lowerKeys.indexOf(norm);
    if (exactIdx !== -1) {
        const match = keys[exactIdx];
        console.log(`✅ resolveColumn: Found exact match "${match}"`);
        return match;
    }

    // 2. Fuzzy match with aliases
    const aliases: Record<string, string[]> = {
        year: ['annee', 'year', 'yr', 'an', 'date_id', 'annee_id', 'id_annee', 'time_detail', 'temps'],
        month: ['mois', 'month', 'mon', 'month_id', 'mois_id', 'id_mois', 'time_detail', 'temps'],
        saison: ['season', 'saison', 'sais', 'trimestre', 'quarter', 'q', 'id_saison', 'time_detail', 'temps'],
        week: ['semaine', 'week', 'wk'],
        day: ['jour', 'day', 'd'],
        client: ['cli_nom', 'customer', 'client', 'client_nom'],
        product: ['produit', 'libelle_produit', 'product', 'prod'],
        produit: ['produit', 'libelle_produit', 'product', 'prod'],
        country: ['pays', 'country'],
        pays: ['pays', 'country'],
        categorie: ['categorie', 'category', 'cat'],
        category: ['categorie', 'category', 'cat'],
        fournisseur: ['fournisseur', 'supplier', 'supp'],
        supplier: ['fournisseور', 'supplier', 'supp'],
        employe: ['employe', 'employee', 'emp'],
        employee: ['employe', 'employee', 'emp'],
        departement: ['departement', 'department', 'dept'],
        department: ['departement', 'department', 'dept']
    };

    // 3. Check aliases and synonyms
    const searchTerms = [norm, ...(aliases[norm] || [])];

    // Check if any alias exists as a substring or exact match in our keys
    for (const term of searchTerms) {
        const foundKeyIdx = lowerKeys.findIndex(k => k === term || k.includes(term) || term.includes(k));
        if (foundKeyIdx !== -1) {
            const match = keys[foundKeyIdx];
            console.log(`✅ resolveColumn: Resolved "${colName}" to "${match}" via match for "${term}"`);
            return match;
        }
    }

    // 4. Reverse lookup in all alias lists
    for (const [mainKey, aliasList] of Object.entries(aliases)) {
        if (aliasList.includes(norm) || norm.includes(mainKey)) {
            for (const alias of [mainKey, ...aliasList]) {
                const foundKeyIdx = lowerKeys.findIndex(k => k === alias || k.includes(alias));
                if (foundKeyIdx !== -1) {
                    const match = keys[foundKeyIdx];
                    console.log(`✅ resolveColumn: Resolved "${colName}" to "${match}" via reverse alias search`);
                    return match;
                }
            }
        }
    }

    console.warn(`❌ resolveColumn: No match for "${colName}" in [${keys.join(', ')}]`);
    return colName;
};

export const getDimensionLabel = (slug: string): string => {
    if (!slug) return 'Select...';

    // Handle combined keys like 'pays+client'
    if (String(slug).includes('+')) {
        return String(slug).split('+').map(part => getDimensionLabel(part)).join(' › ');
    }

    const s = String(slug).toLowerCase();
    const specificMapping: Record<string, string> = {
        'year': 'Year', 'annee': 'Year',
        'month': 'Month', 'mois': 'Month',
        'saison': 'Season', 'season': 'Season',
        'categorie': 'Category', 'category': 'Category',
        'produit': 'Product', 'product': 'Product',
        'fournisseur': 'Supplier', 'supplier': 'Supplier',
        'client': 'Client', 'customer': 'Client',
        'pays': 'Country', 'country': 'Country',
        'employe': 'Employee', 'employee': 'Employee',
        'departement': 'Department', 'department': 'Department',
        'all': 'All'
    };

    if (specificMapping[s]) return specificMapping[s];

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
