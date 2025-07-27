<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Listing extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'nft_id',
        'seller_id',
        'type',
        'price',
        'auction_end',
        'royalty_percentage',
    ];

    public function bids()
    {
        return $this->hasMany(Bid::class);
    }
}
