<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Listing;
use App\Models\Bid;

class BidTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_bids_for_listing()
    {
        $listing = Listing::factory()->create();
        Bid::factory()->count(2)->create(['listing_id' => $listing->id]);
        $response = $this->getJson("/api/listings/{$listing->id}/bids");
        $response->assertStatus(200)->assertJsonStructure(['data' => ['data', 'links', 'meta']]);
    }

    public function test_can_place_bid()
    {
        $listing = Listing::factory()->create();
        $payload = [
            'bidder_id' => '33333333-3333-3333-3333-333333333333',
            'amount' => 2.5,
            'currency' => 'ETH',
        ];
        $response = $this->postJson("/api/listings/{$listing->id}/bids", $payload);
        $response->assertStatus(201)->assertJsonStructure(['data']);
    }

    public function test_validation_fails_for_invalid_bid()
    {
        $listing = Listing::factory()->create();
        $payload = [
            'bidder_id' => '',
            'amount' => -1,
            'currency' => '',
        ];
        $response = $this->postJson("/api/listings/{$listing->id}/bids", $payload);
        $response->assertStatus(422);
    }
}
