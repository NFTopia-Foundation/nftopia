<?php

namespace App\Services;

use App\Models\Listing;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Exception;

class ListingService
{
    public function __construct(protected Listing $listing){}

    public function createListing(array $data): Listing
    {
        $this->validateListing($data);

        $existingListing = $this->listing->where('nft_contract_address', $data['nft_contract_address'])
            ->where('token_id', $data['token_id'])
            ->where('status', 'active')
            ->first();

        if ($existingListing) {
            throw new Exception('NFT is already listed');
        }

        $listing = $this->listing->create([
            'nft_contract_address' => $data['nft_contract_address'],
            'token_id' => $data['token_id'],
            'seller_id' => $data['seller_id'],
            'listing_type' => $data['listing_type'],
            'price' => $data['price'],
            'auction_end' => $data['auction_end'] ?? null,
            'status' => 'active'
        ]);

        return $listing;
    }

    public function getActiveListings(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->listing->active()
            ->with(['bids' => function ($query) {
                $query->orderByDesc('amount')->limit(1);
            }]);

        if (!empty($filters['listing_type'])) {
            $query->where('listing_type', $filters['listing_type']);
        }

        if (!empty($filters['seller_id'])) {
            $query->where('seller_id', $filters['seller_id']);
        }

        if (!empty($filters['min_price'])) {
            $query->where('price', '>=', $filters['min_price']);
        }

        if (!empty($filters['max_price'])) {
            $query->where('price', '<=', $filters['max_price']);
        }

        if (!empty($filters['contract_address'])) {
            $query->where('nft_contract_address', $filters['contract_address']);
        }

        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortOrder = $filters['sort_order'] ?? 'desc';
        
        $query->orderBy($sortBy, $sortOrder);

        return $query->paginate($perPage);
    }

    public function getListing(string $id): Listing
    {
        return $this->listing->with(['bids', 'transaction'])->findOrFail($id);
    }

    public function getListingsBySeller(string $sellerId, int $perPage = 15): LengthAwarePaginator
    {
        return $this->listing->where('seller_id', $sellerId)
            ->with(['bids', 'transaction'])
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * Update listing price (only for fixed price listings)
     */
    public function updateListingPrice(string $id, string $newPrice, string $sellerId): Listing
    {
        $listing = $this->listing->where('id', $id)
            ->where('seller_id', $sellerId)
            ->where('status', 'active')
            ->firstOrFail();

        if ($listing->listing_type !== 'fixed_price') {
            throw new Exception('Can only update price for fixed price listings');
        }

        // Check if there are any pending bids
        $hasBids = $listing->bids()->where('status', 'pending')->exists();
        if ($hasBids) {
            throw new Exception('Cannot update price when there are pending bids');
        }

        $listing->update(['price' => $newPrice]);

        return $listing->fresh();
    }

    public function cancelListing(string $id, string $sellerId): Listing
    {
        $listing = $this->listing->where('id', $id)
            ->where('seller_id', $sellerId)
            ->where('status', 'active')
            ->firstOrFail();

        $listing->bids()->where('status', 'pending')->update(['status' => 'rejected']);

        $listing->update(['status' => 'canceled']);

        return $listing->fresh();
    }

    public function markAsSold(string $id): Listing
    {
        $listing = $this->listing->findOrFail($id);
        $listing->update(['status' => 'sold']);

        return $listing;
    }

    public function getAuctionsEndingSoon(int $hours = 24): Collection
    {
        return $this->listing->activeAuctions()
            ->where('auction_end', '<=', now()->addHours($hours))
            ->with(['bids'])
            ->get();
    }

    /**
     * Get expired auctions that need processing
     */
    public function getExpiredAuctions(): Collection
    {
        return $this->listing->expiredAuctions()->get();
    }

    public function searchListings(string $searchTerm, int $perPage = 15): LengthAwarePaginator
    {
        return NftListing::active()
            ->where(function ($query) use ($searchTerm) {
                $query->where('nft_contract_address', 'ILIKE', "%{$searchTerm}%")
                    ->orWhere('token_id', 'ILIKE', "%{$searchTerm}%");
            })
            ->with(['bids'])
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function getListingStats(): array
    {
        $totalActive = $this->listing->active()->count();
        $totalSold = $this->listing->where('status', 'sold')->count();
        $totalCanceled = $this->listing->where('status', 'canceled')->count();
        $activeAuctions = $this->listing->activeAuctions()->count();
        $activeFixedPrice = $this->listing->active()->fixedPrice()->count();

        return [
            'total_active' => $totalActive,
            'total_sold' => $totalSold,
            'total_canceled' => $totalCanceled,
            'active_auctions' => $activeAuctions,
            'active_fixed_price' => $activeFixedPrice,
        ];
    }

    /**
     * Validate listing data
     */
    private function validateListing(array $data): void
    {
        // Validate contract address format (Ethereum address)
        if (!preg_match('/^0x[a-fA-F0-9]{40}$/', $data['nft_contract_address'])) {
            throw new Exception('Invalid contract address format');
        }

        if (bccomp($data['price'], '0', 18) <= 0) {
            throw new Exception('Price must be greater than 0');
        }

        if ($data['listing_type'] === 'auction') {
            if (empty($data['auction_end'])) {
                throw new Exception('Auction end time is required for auction listings');
            }

            $auctionEnd = new \DateTime($data['auction_end']);
            if ($auctionEnd <= new \DateTime()) {
                throw new Exception('Auction end time must be in the future');
            }
        }

        if ($data['listing_type'] === 'fixed_price' && !empty($data['auction_end'])) {
            throw new Exception('Fixed price listings cannot have an auction end time');
        }
    }
}