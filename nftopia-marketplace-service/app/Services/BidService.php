<?php

namespace App\Services;

use App\Models\Bid;
use App\Models\Listing;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Exception;

class BidService
{
    public function __construct(protected Listing $listing, protected Bid $bid){}
    
    public function createBid(array $data): Bid
    {
        $listing = $this->listing->findOrFail($data['listing_id']);

        $this->validateBid($listing, $data);

        $bid = $this->bid->create([
            'listing_id' => $data['listing_id'],
            'bidder_id' => $data['bidder_id'],
            'amount' => $data['amount'],
            'status' => 'pending'
        ]);

        return $bid;
    }

    public function getBidsForListing(string $listingId, int $perPage = 15): LengthAwarePaginator
    {
        return $this->bid->where('listing_id', $listingId)
            ->with(['listing'])
            ->orderByDesc('amount')
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function getBidsByBidder(string $bidderId, int $perPage = 15): LengthAwarePaginator
    {
        return $this->bid->where('bidder_id', $bidderId)
            ->with(['listing'])
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * Accept a bid (for auction listings)
     */
    public function acceptBid(string $bidId): Bid
    {
        $bid = $this->bid->findOrFail($bidId);
        $listing = $bid->listing;

        if (!$listing->isAuction()) {
            throw new Exception('Can only accept bids for auction listings');
        }

        if ($listing->status !== 'active') {
            throw new Exception('Listing is not active');
        }

        $bid->update(['status' => 'accepted']);

        // Reject all other pending bids for this listing
        $this->bid->where('listing_id', $listing->id)
            ->where('id', '!=', $bid->id)
            ->where('status', 'pending')
            ->update(['status' => 'rejected']);

        $listing->update(['status' => 'sold']);

        return $bid->fresh();
    }

    public function cancelBid(string $bidId, string $bidderId): Bid
    {
        $bid = $this->bid->where('id', $bidId)
            ->where('bidder_id', $bidderId)
            ->where('status', 'pending')
            ->firstOrFail();

        $bid->update(['status' => 'canceled']);

        return $bid;
    }

    public function getHighestBid(string $listingId): ?Bid
    {
        return $this->bid->where('listing_id', $listingId)
            ->where('status', 'pending')
            ->orderByDesc('amount')
            ->first();
    }

    public function updateBidTransactionHash(string $bidId, string $transactionHash): Bid
    {
        $bid = $this->bid->findOrFail($bidId);
        $bid->update(['transaction_hash' => $transactionHash]);

        return $bid;
    }

    public function processExpiredAuctions(): Collection
    {
        $expiredListings = $this->listing->expiredAuctions()->get();
        $processedBids = collect();

        foreach ($expiredListings as $listing) {
            $highestBid = $this->getHighestBid($listing->id);
            
            if ($highestBid) {
                $acceptedBid = $this->acceptBid($highestBid->id);
                $processedBids->push($acceptedBid);
            } else {
                $listing->update(['status' => 'canceled']);
            }
        }

        return $processedBids;
    }


    private function validateBid(Listing $listing, array $data): void
    {
        if ($listing->status !== 'active') {
            throw new Exception('Listing is not active');
        }

        if ($listing->seller_id === $data['bidder_id']) {
            throw new Exception('Seller cannot bid on their own listing');
        }

        if ($listing->isFixedPrice() && bccomp($data['amount'], $listing->price, 18) !== 0) {
            throw new Exception('Bid amount must equal listing price for fixed price listings');
        }

        if ($listing->isAuction() && $listing->isAuctionEnded()) {
            throw new Exception('Auction has ended');
        }

        if ($listing->isAuction()) {
            $currentHighest = $this->getHighestBid($listing->id);
            if ($currentHighest && bccomp($data['amount'], $currentHighest->amount, 18) <= 0) {
                throw new Exception('Bid amount must be higher than current highest bid');
            }

            if (bccomp($data['amount'], $listing->price, 18) < 0) {
                throw new Exception('Bid amount must be at least the starting price');
            }
        }

        // Check if bidder already has a pending bid for this listing
        $existingBid = $this->bid->where('listing_id', $listing->id)
            ->where('bidder_id', $data['bidder_id'])
            ->where('status', 'pending')
            ->first();

        if ($existingBid) {
            throw new Exception('Bidder already has a pending bid for this listing');
        }
    }
}