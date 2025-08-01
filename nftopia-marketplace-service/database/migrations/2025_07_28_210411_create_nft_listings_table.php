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
        Schema::create('nft_listings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nft_contract_address', 42);
            $table->string('token_id', 78);
            $table->uuid('seller_id');
            $table->enum('listing_type', ['fixed_price', 'auction']);
            $table->decimal('price', 36, 18);
            $table->timestamp('auction_end')->nullable();
            $table->enum('status', ['active', 'sold', 'canceled'])->default('active');
            $table->timestamps();

            $table->json('metadata')->nullable(); // Store additional NFT metadata for faster queries

            $table->index(['status', 'auction_end'], 'idx_active_auctions');
            $table->index(['status', 'listing_type'], 'idx_active_by_type');
            $table->index('seller_id');
            $table->index(['nft_contract_address', 'token_id']);

            $table->unique(['nft_contract_address', 'token_id'], 'unique_nft_listing');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nft_listings');
    }
};