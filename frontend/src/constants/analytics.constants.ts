import type { DimensionLevel, MeasureKey } from '../types/analytics.types';

export const MEASURE_LABELS: Record<MeasureKey, string> = {
    nombre_commandes: 'Orders',
    total_retard: 'Total Delay',
    moyenne_retard: 'Avg Delay',
    min_retard: 'Min Delay',
    max_retard: 'Max Delay',
    moy_prevue: 'Avg Planned',
    moy_reelle: 'Avg Real',
    ecart_moyen: 'Avg Dev'
};

export const HIERARCHIES: Record<string, DimensionLevel[]> = {
    temp: ['ALL', 'year', 'year+saison', 'year+month'],
    emp: ['ALL', 'DEPARTEMENT', 'DEPARTEMENT+EMPLOYE'],
    clie: ['ALL', 'pays', 'pays+client']
};

export const COLUMN_TO_DIMENSION: Record<string, string> = {
    year: 'temp', saison: 'temp', month: 'temp', 'year+saison': 'temp', 'year+month': 'temp',
    DEPARTEMENT: 'emp', EMPLOYE: 'emp', 'DEPARTEMENT+EMPLOYE': 'emp',
    categorie: 'prod', produit: 'prod', fournisseur: 'prod', 'categorie+produit': 'prod',
    'fournisseur+produit': 'prod', 'categorie+produit+fournisseur': 'prod',
    pays: 'clie', client: 'clie', 'pays+client': 'clie'
};

export const TABLE_MEASURES: MeasureKey[] = [
    'nombre_commandes',
    'total_retard',
    'moyenne_retard',
    'min_retard',
    'max_retard',
    'moy_prevue',
    'moy_reelle',
    'ecart_moyen'
];

export const API_BASE_URL = 'http://localhost:8000/analyse_app/api/analyse/';
