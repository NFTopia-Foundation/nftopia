use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\BidController;

Route::prefix('listings')->group(function () {
    Route::middleware('throttle:100,1')->group(function () {
        Route::get('/', [ListingController::class, 'index']); // List all active listings (paginated)
        Route::post('/', [ListingController::class, 'store']); // Create new listing

        Route::prefix('{listing}')->group(function () {
            Route::get('/', [ListingController::class, 'show']); // Get listing details
            Route::put('/', [ListingController::class, 'update']); // Update listing
            Route::delete('/', [ListingController::class, 'destroy']); // Cancel listing

            Route::prefix('bids')->group(function () {
                Route::get('/', [BidController::class, 'index']); // List all bids
                Route::post('/', [BidController::class, 'store']); // Place new bid

                Route::prefix('{bid}')->group(function () {
                    Route::get('/', [BidController::class, 'show']); // Get bid details
                    Route::delete('/', [BidController::class, 'destroy']); // Retract bid
                });
            });
        });
    });
});
