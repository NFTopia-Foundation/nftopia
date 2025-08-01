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
        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('listing_id');
            $table->uuid('buyer_id');
            $table->string('payment_service_id', 36);
            $table->decimal('final_price', 36, 18);
            $table->decimal('royalty_percentage', 5, 2);
            $table->string('blockchain_tx_hash', 66);
            $table->timestamps();

            $table->index('blockchain_tx_hash', 'idx_blockchain_tx_idempotency');
            $table->index('listing_id');
            $table->index('buyer_id');
            $table->index('payment_service_id');

            $table->unique('blockchain_tx_hash', 'unique_blockchain_tx');

            $table->foreign('listing_id')->references('id')->on('nft_listings')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};