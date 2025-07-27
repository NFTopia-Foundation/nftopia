<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Bid extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'listing_id',
        'bidder_id',
        'amount',
        'currency',
    ];

    public function listing()
    {
        return $this->belongsTo(Listing::class);
    }
}
