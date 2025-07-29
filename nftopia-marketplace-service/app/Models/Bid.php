<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Bid extends Model
{
    use HasFactory;

    protected $fillable = [
        'listing_id',
        'bidder_id',
        'amount',
        'transaction_hash',
        'status',
    ];

    protected $casts = [
        'id' => 'string',
        'listing_id' => 'string',
        'bidder_id' => 'string',
        'amount' => 'decimal:18',
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

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeAccepted($query)
    {
        return $query->where('status', 'accepted');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeCanceled($query)
    {
        return $query->where('status', 'canceled');
    }

    /**
     * Scope to get bids for a specific listing ordered by amount (highest first)
     */
    public function scopeForListingByAmount($query, $listingId)
    {
        return $query->where('listing_id', $listingId)->orderByDesc('amount');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isAccepted(): bool
    {
        return $this->status === 'accepted';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    public function isCanceled(): bool
    {
        return $this->status === 'canceled';
    }
}