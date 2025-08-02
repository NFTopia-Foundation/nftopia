<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ListingController;
use App\Http\Controllers\Api\BidController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AuthController;
 use App\Http\Controllers\AdminUserController;

Route::post('/login', [AuthController::class, 'login']);


Route::group(['middleware' => ['auth:sanctum', 'throttle:60,1']], function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/admin/users/{user}/revoke-tokens', [AdminUserController::class, 'revokeTokens'])->middleware('can:revoke-user-tokens'); 

});

Route::middleware(['auth:sanctum', 'throttle:100,1'])->prefix('listings')->group(function () {
    Route::get('/', [ListingController::class, 'index']);
    Route::post('/', [ListingController::class, 'store']);
    Route::prefix('{listing}')->group(function () {
        Route::get('/', [ListingController::class, 'show']);
        Route::put('/', [ListingController::class, 'update']);
        Route::delete('/', [ListingController::class, 'destroy']);
        Route::prefix('bids')->group(function () {
            Route::get('/', [BidController::class, 'index']);
            Route::post('/', [BidController::class, 'store']);
            Route::prefix('{bid}')->group(function () {
                Route::get('/', [BidController::class, 'show']);
                Route::delete('/', [BidController::class, 'destroy']);
            });
        });
    });
});
