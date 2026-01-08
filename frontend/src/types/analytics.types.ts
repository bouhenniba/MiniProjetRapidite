export type DimensionLevel =
    | 'ALL' | 'year' | 'saison' | 'month' | 'year+saison' | 'year+month'
    | 'EMPLOYE' | 'DEPARTEMENT' | 'DEPARTEMENT+EMPLOYE'
    | 'produit' | 'categorie' | 'fournisseur' | 'categorie+produit' | 'fournisseur+produit'
    | 'categorie+produit+fournisseur'
    | 'client' | 'pays' | 'pays+client';

export type MeasureKey =
    | 'nombre_commandes'
    | 'moyenne_retard'
    | 'total_retard'
    | 'min_retard'
    | 'max_retard'
    | 'moy_prevue'
    | 'moy_reelle'
    | 'ecart_moyen';

export interface OLAPRecord {
    [key: string]: any;
    nombre_commandes: number;
    moyenne_retard: number;
    total_retard: number;
    min_retard: number;
    max_retard: number;
    moy_prevue: number;
    moy_reelle: number;
    ecart_moyen: number;
}

export interface DrillPathItem {
    temp: DimensionLevel;
    clie: DimensionLevel;
    emp: DimensionLevel;
    prod: DimensionLevel;
    label: string;
}

export interface APIResponse {
    success: boolean;
    data: OLAPRecord[];
    dimensions: {
        temp: string;
        clie: string;
        emp: string;
        prod: string;
    };
    metadata: {
        dimension_count: number;
        record_count: number;
        dimension_columns: string[];
    };
    error?: string;
}

export interface Dimensions {
    temp: DimensionLevel;
    clie: DimensionLevel;
    emp: DimensionLevel;
    prod: DimensionLevel;
}
