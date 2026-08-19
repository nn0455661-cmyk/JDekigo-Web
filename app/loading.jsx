export default function Loading() {
    return (
        <section className="dashboard-shell min-h-60 p-5 sm:p-7" role="status" aria-live="polite" aria-busy="true">
            <div className="loading-state">
                <div className="loading-state-icon" aria-hidden="true">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="loading-state-text">Đang mở trang...</p>
                    <div className="loading-skeleton-stack" aria-hidden="true">
                        <span className="loading-skeleton-line loading-skeleton-line-1" />
                        <span className="loading-skeleton-line loading-skeleton-line-2" />
                        <span className="loading-skeleton-line loading-skeleton-line-3" />
                    </div>
                </div>
            </div>
        </section>
    );
}
