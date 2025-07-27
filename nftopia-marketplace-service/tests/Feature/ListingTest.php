<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Listing;

class ListingTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_active_listings()
    {
        Listing::factory()->count(3)->create(['type' => 'fixed_price']);
        $response = $this->getJson('/api/listings');
        $response->assertStatus(200)->assertJsonStructure(['data' => ['data', 'links', 'meta']]);
    }

    public function test_can_create_listing()
    {
        $payload = [
            'nft_id' => '11111111-1111-1111-1111-111111111111',
            'seller_id' => '22222222-2222-2222-2222-222222222222',
            'type' => 'fixed_price',
            'price' => 1.5,
            'auction_end' => null,
            'royalty_percentage' => 5.0,
        ];
        $response = $this->postJson('/api/listings', $payload);
        $response->assertStatus(201)->assertJsonStructure(['data']);
    }

    public function test_validation_fails_for_invalid_listing()
    {
        $payload = [
            'nft_id' => 'not-a-uuid',
            'seller_id' => '',
            'type' => 'invalid',
            'price' => -1,
            'auction_end' => 'yesterday',
            'royalty_percentage' => 200,
        ];
        $response = $this->postJson('/api/listings', $payload);
        $response->assertStatus(422);
    }
}
