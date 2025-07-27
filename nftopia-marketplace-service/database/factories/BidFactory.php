<?php

namespace Database\Factories;

use App\Models\Bid;
use App\Models\Listing;
use Illuminate\Database\Eloquent\Factories\Factory;

class BidFactory extends Factory
{
    protected $model = Bid::class;

    public function definition()
    {
        return [
            'listing_id' => Listing::factory(),
            'bidder_id' => $this->faker->uuid,
            'amount' => $this->faker->randomFloat(2, 1, 100),
            'currency' => $this->faker->randomElement(['ETH', 'USDT', 'DAI']),
        ];
    }
}
