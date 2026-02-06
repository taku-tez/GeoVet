/**
 * GeoVet - Database Management
 *
 * GeoLite2 database download and update
 */
interface DbStatus {
    edition: string;
    path: string;
    exists: boolean;
    size?: number;
    modifiedAt?: Date;
}
export declare function getDbStatus(): Promise<DbStatus[]>;
export declare function downloadDb(licenseKey: string): Promise<void>;
export declare function formatDbStatus(statuses: DbStatus[]): string;
export {};
//# sourceMappingURL=db.d.ts.map