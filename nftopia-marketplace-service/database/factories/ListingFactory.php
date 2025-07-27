<?php

namespace Database\Factories;

use App\Models\Listing;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ListingFactory extends Factory
{
    protected $model = Listing::class;

    public function definition()
    {
        return [
            'nft_id' => $this->faker->uuid,
            'seller_id' => $this->faker->uuid,
            'type' => $this->faker->randomElement(['fixed_price', 'auction']),
            'price' => $this->faker->randomFloat(2, 1, 100),
            'auction_end' => null,
            'royalty_percentage' => $this->faker->randomFloat(2, 0, 10),
        ];
    }
}
