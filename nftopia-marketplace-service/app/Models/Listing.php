<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Listing extends Model
{
    use HasFactory;

    protected $fillable = [
        'nft_contract_address',
        'token_id',
        'seller_id',
        'listing_type',
        'price',
        'auction_end',
        'status',
    ];

    protected $casts = [
        'id' => 'string',
        'price' => 'decimal:18',
        'auction_end' => 'datetime',
        'seller_id' => 'string',
    ];

    public $incrementing = false;
    protected $keyType = 'string';

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function bids(): HasMany
    {
        return $this->hasMany(Bid::class, 'listing_id');
    }

    public function winningBid(): HasOne
    {
        return $this->hasOne(Bid::class, 'listing_id')
            ->where('status', 'accepted')
            ->latest('amount');
    }

    public function highestBid(): HasOne
    {
        return $this->hasOne(Bid::class, 'listing_id')
            ->orderByDesc('amount');
    }

    public function transaction(): HasOne
    {
        return $this->hasOne(Transaction::class, 'listing_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeAuctions($query)
    {
        return $query->where('listing_type', 'auction');
    }

    public function scopeFixedPrice($query)
    {
        return $query->where('listing_type', 'fixed_price');
    }

    public function scopeActiveAuctions($query)
    {
        return $query->active()
            ->auctions()
            ->where('auction_end', '>', now());
    }

    public function scopeExpiredAuctions($query)
    {
        return $query->active()
            ->auctions()
            ->where('auction_end', '<=', now());
    }

    public function isAuction(): bool
    {
        return $this->listing_type === 'auction';
    }

    public function isFixedPrice(): bool
    {
        return $this->listing_type === 'fixed_price';
    }

    public function isAuctionEnded(): bool
    {
        return $this->isAuction() && $this->auction_end && $this->auction_end <= now();
    }

    public function getCurrentHighestBid(): ?string
    {
        $highestBid = $this->bids()
            ->where('status', 'pending')
            ->orderByDesc('amount')
            ->first();

        return $highestBid ? $highestBid->amount : null;
    }
}