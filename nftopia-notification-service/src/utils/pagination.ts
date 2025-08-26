export interface PaginationOptions {
    page?: number; // 1-based
    limit?: number; // per page
    }
    
    
    export const normalizePagination = (options?: PaginationOptions) => {
    const page = Math.max(1, Number(options?.page || 1));
    const limit = Math.min(100, Math.max(1, Number(options?.limit || 20)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
    };