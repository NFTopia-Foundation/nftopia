<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('bids', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('listing_id');
            $table->uuid('bidder_id');
            $table->decimal('amount', 36, 18);
            $table->string('transaction_hash', 66)->nullable();
            $table->enum('status', ['pending', 'accepted', 'rejected', 'canceled'])->default('pending');
            $table->timestamps();

            $table->index(['listing_id', 'amount'], 'idx_bid_leaderboard');
            $table->index('bidder_id');
            $table->index('transaction_hash');
            $table->index(['listing_id', 'status']);

            $table->foreign('listing_id')->references('id')->on('nft_listings')->onDelete('cascade');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bids');
    }
};