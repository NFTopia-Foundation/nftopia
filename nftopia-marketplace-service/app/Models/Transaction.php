<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Transaction extends Model
{
    use HasFactory;

    protected $table = 'transactions';

    protected $fillable = [
        'listing_id',
        'buyer_id',
        'payment_service_id',
        'final_price',
        'royalty_percentage',
        'blockchain_tx_hash',
    ];

    protected $casts = [
        'id' => 'string',
        'listing_id' => 'string',
        'buyer_id' => 'string',
        'final_price' => 'decimal:18',
        'royalty_percentage' => 'decimal:2',
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

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class, 'listing_id');
    }

    /**
     * Calculate royalty amount
     */
    public function getRoyaltyAmount(): string
    {
        return bcmul($this->final_price, bcdiv($this->royalty_percentage, '100', 18), 18);
    }

    /**
     * Calculate seller proceeds (final price minus royalty)
     */
    public function getSellerProceeds(): string
    {
        return bcsub($this->final_price, $this->getRoyaltyAmount(), 18);
    }

    public function scopeByBlockchainHash($query, $hash)
    {
        return $query->where('blockchain_tx_hash', $hash);
    }

    public function scopeForBuyer($query, $buyerId)
    {
        return $query->where('buyer_id', $buyerId);
    }

    public function scopeForListing($query, $listingId)
    {
        return $query->where('listing_id', $listingId);
    }
}