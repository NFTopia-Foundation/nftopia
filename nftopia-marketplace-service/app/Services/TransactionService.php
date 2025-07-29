<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\Listing;
use App\Models\Bid;
use Illuminate\Pagination\LengthAwarePaginator;
use Exception;

class TransactionService
{
    public function __construct(protected Transaction $transaction, protected Listing $listing, protected Bid $bid){}
    
    public function createTransaction(array $data): Transaction
    {
        $this->validateTransaction($data);

        $existingTransaction = $this->transaction->where('blockchain_tx_hash', $data['blockchain_tx_hash'])->first();
        if ($existingTransaction) {
            return $existingTransaction;
        }

        $listing = $this->listing->findOrFail($data['listing_id']);

        $transaction = $this->transaction->create([
            'listing_id' => $data['listing_id'],
            'buyer_id' => $data['buyer_id'],
            'payment_service_id' => $data['payment_service_id'],
            'final_price' => $data['final_price'],
            'royalty_percentage' => $data['royalty_percentage'] ?? '0.00',
            'blockchain_tx_hash' => $data['blockchain_tx_hash'],
        ]);

        $listing->update(['status' => 'sold']);

        // If this was from an accepted bid, update the bid
        if (!empty($data['bid_id'])) {
            $bid = $this->bid->find($data['bid_id']);
            if ($bid) {
                $bid->update([
                    'status' => 'accepted',
                    'transaction_hash' => $data['blockchain_tx_hash']
                ]);

                $this->bid->where('listing_id', $listing->id)
                    ->where('id', '!=', $bid->id)
                    ->where('status', 'pending')
                    ->update(['status' => 'rejected']);
            }
        }

        return $transaction;
    }

    public function getTransaction(string $id): Transaction
    {
        return $this->transaction->with(['listing'])->findOrFail($id);
    }

    public function getTransactionByHash(string $blockchainHash): ?Transaction
    {
        return $this->transaction->with(['listing'])->where('blockchain_tx_hash', $blockchainHash)->first();
    }

    public function getTransactionsForBuyer(string $buyerId, int $perPage = 15): LengthAwarePaginator
    {
        return $this->transaction->where('buyer_id', $buyerId)
            ->with(['listing'])
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function getTransactionsForSeller(string $sellerId, int $perPage = 15): LengthAwarePaginator
    {
        return $this->transaction->whereHas('listing', function ($query) use ($sellerId) {
                $query->where('seller_id', $sellerId);
            })
            ->with(['listing'])
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function getAllTransactions(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->transaction->with(['listing']);

        if (!empty($filters['buyer_id'])) {
            $query->where('buyer_id', $filters['buyer_id']);
        }

        if (!empty($filters['min_price'])) {
            $query->where('final_price', '>=', $filters['min_price']);
        }

        if (!empty($filters['max_price'])) {
            $query->where('final_price', '<=', $filters['max_price']);
        }

        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        if (!empty($filters['contract_address'])) {
            $query->whereHas('listing', function ($q) use ($filters) {
                $q->where('nft_contract_address', $filters['contract_address']);
            });
        }

        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortOrder = $filters['sort_order'] ?? 'desc';
        
        $query->orderBy($sortBy, $sortOrder);

        return $query->paginate($perPage);
    }

    public function getTransactionStats(array $filters = []): array
    {
        $query = $this->transaction->query();

        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        $totalTransactions = $query->count();
        $totalVolume = $query->sum('final_price') ?? '0';
        $averagePrice = $totalTransactions > 0 ? bcdiv($totalVolume, $totalTransactions, 18) : '0';
        $totalRoyalties = $query->get()->sum(function ($transaction) {
            return $transaction->getRoyaltyAmount();
        });

        // Get top contracts by volume
        $topContracts = $this->transaction->selectRaw('
                listings.nft_contract_address,
                COUNT(*) as transaction_count,
                SUM(final_price) as total_volume
            ')
            ->join('nft_listings as listings', 'transactions.listing_id', '=', 'listings.id')
            ->when(!empty($filters['date_from']), function ($q) use ($filters) {
                $q->where('transactions.created_at', '>=', $filters['date_from']);
            })
            ->when(!empty($filters['date_to']), function ($q) use ($filters) {
                $q->where('transactions.created_at', '<=', $filters['date_to']);
            })
            ->groupBy('listings.nft_contract_address')
            ->orderByDesc('total_volume')
            ->limit(10)
            ->get();

        return [
            'total_transactions' => $totalTransactions,
            'total_volume' => $totalVolume,
            'average_price' => $averagePrice,
            'total_royalties' => $totalRoyalties,
            'top_contracts' => $topContracts,
        ];
    }

    public function getDailyVolume(int $days = 30): array
    {
        $startDate = now()->subDays($days)->startOfDay();

        return $this->transaction->selectRaw('
                DATE(created_at) as date,
                COUNT(*) as transaction_count,
                SUM(final_price) as daily_volume
            ')
            ->where('created_at', '>=', $startDate)
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->toArray();
    }

    private function validateTransaction(array $data): void
    {
        if (!preg_match('/^0x[a-fA-F0-9]{64}$/', $data['blockchain_tx_hash'])) {
            throw new Exception('Invalid blockchain transaction hash format');
        }

        if (bccomp($data['final_price'], '0', 18) <= 0) {
            throw new Exception('Final price must be greater than 0');
        }

        if (isset($data['royalty_percentage'])) {
            if (bccomp($data['royalty_percentage'], '0', 2) < 0 || bccomp($data['royalty_percentage'], '100', 2) > 0) {
                throw new Exception('Royalty percentage must be between 0 and 100');
            }
        }

        $listing = $this->listing->find($data['listing_id']);
        if (!$listing) {
            throw new Exception('Listing not found');
        }

        if ($listing->status !== 'active') {
            throw new Exception('Listing is not active');
        }

        if ($listing->seller_id === $data['buyer_id']) {
            throw new Exception('Seller cannot buy their own NFT');
        }
    }
}