<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Listing;
use App\Models\Bid;
use App\Models\Transaction;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

use Exception;

class MarketplaceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing data
        DB::statement('SET session_replication_role = replica;');
        
        Transaction::truncate();
        Bid::truncate();
        Listing::truncate();

        DB::statement('SET session_replication_role = origin;');

        $this->command->info('Creating marketplace seed data...');

        // Sample contract addresses (mock Ethereum addresses)
        $contractAddresses = [
            '0x1234567890123456789012345678901234567890',
            '0x0987654321098765432109876543210987654321',
            '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            '0x5678901234567890123456789012345678901234',
            '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        ];

        // Sample user IDs (would normally come from user service)
        $userIds = [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002', 
            '550e8400-e29b-41d4-a716-446655440003',
            '550e8400-e29b-41d4-a716-446655440004',
            '550e8400-e29b-41d4-a716-446655440005',
            '550e8400-e29b-41d4-a716-446655440006',
        ];

        $listings = [];
        
        $this->command->info('Creating fixed price listings...');
        
        // Create fixed price listings
        for ($i = 0; $i < 15; $i++) {
            try {
                $listing = Listing::create([
                    'nft_contract_address' => $contractAddresses[array_rand($contractAddresses)],
                    'token_id' => (string) rand(1, 10000),
                    'seller_id' => $userIds[array_rand($userIds)],
                    'listing_type' => 'fixed_price',
                    'price' => number_format(rand(100, 10000) / 1000, 3, '.', ''), // 0.100 to 10.000 ETH
                    'status' => 'active',
                ]);
                $listings[] = $listing;
                
                if (($i + 1) % 5 == 0) {
                    $this->command->info("Created " . ($i + 1) . " fixed price listings...");
                }
            } catch (Exception $e) {
                $this->command->error("Error creating fixed price listing: " . $e->getMessage());
            }
        }

        $this->command->info('Creating auction listings...');
        
        // Create auction listings
        for ($i = 0; $i < 15; $i++) {
            try {
                $auctionEnd = now()->addDays(rand(1, 30))->addHours(rand(1, 23));
                
                $listing = Listing::create([
                    'nft_contract_address' => $contractAddresses[array_rand($contractAddresses)],
                    'token_id' => (string) rand(10001, 20000),
                    'seller_id' => $userIds[array_rand($userIds)],
                    'listing_type' => 'auction',
                    'price' => number_format(rand(50, 5000) / 1000, 3, '.', ''), // 0.050 to 5.000 ETH starting price
                    'auction_end' => $auctionEnd,
                    'status' => 'active',
                ]);
                $listings[] = $listing;
                
                if (($i + 1) % 5 == 0) {
                    $this->command->info("Created " . ($i + 1) . " auction listings...");
                }
            } catch (Exception $e) {
                $this->command->error("Error creating auction listing: " . $e->getMessage());
            }
        }

        $this->command->info('Creating bids for auction listings...');
        
        // Create sample bids for auction listings
        $auctionListings = collect($listings)->filter(function ($listing) {
            return $listing->listing_type === 'auction';
        });

        $totalBids = 0;
        foreach ($auctionListings as $listing) {
            $numBids = rand(1, 6); // 1 to 6 bids per auction
            $currentPrice = $listing->price;
            
            for ($i = 0; $i < $numBids; $i++) {
                try {
                    // Ensure bidder is not the seller
                    $availableBidders = array_values(array_filter($userIds, function($userId) use ($listing) {
                        return $userId !== $listing->seller_id;
                    }));

                    if (count($availableBidders) === 0) {
                        $this->command->warn("No available bidders for listing {$listing->id}");
                        continue;
                    }
                    
                    // Increment bid amount progressively
                    $increment = number_format(rand(10, 100) / 1000, 3, '.', ''); // 0.010 to 0.100 ETH increment
                    $bidAmount = bcadd($currentPrice, $increment, 18);
                    
                    $bid = Bid::create([
                        'listing_id' => $listing->id,
                        'bidder_id' => array_values($availableBidders)[array_rand($availableBidders)],
                        'amount' => $bidAmount,
                        'status' => 'pending',
                    ]);
                    
                    $currentPrice = $bidAmount;
                    $totalBids++;
                    
                } catch (Exception $e) {
                    $this->command->error("Error creating bid: " . $e->getMessage());
                }
            }
        }

        $this->command->info("Created {$totalBids} bids");

        $this->command->info('Creating transactions for sold listings...');

        $transactionCount = 0;
        
        // Create some completed transactions (sold listings)
        $listingsToSell = collect($listings)
            ->filter(fn($l) => $l->status === 'active')
            ->random(min(8, count($listings)));

            foreach ($listingsToSell as $listing) {
                try {
                    $availableBuyers = array_values(array_filter($userIds, fn($id) => $id !== $listing->seller_id));
                    
                    if (count($availableBuyers) === 0) {
                        $this->command->warn("No available buyers for listing {$listing->id}");
                        continue;
                    }

                $buyerId = $availableBuyers[array_rand($availableBuyers)];
                $finalPrice = $listing->price;
                
                // If it's an auction, use the highest bid as final price
                if ($listing->listing_type === 'auction') {
                    $highestBid = $listing->bids()->orderByDesc('amount')->first();
                    if ($highestBid) {
                        $finalPrice = $highestBid->amount;
                        $buyerId = $highestBid->bidder_id;
                    }
                }
                
                // Mark listing as sold
                $listing->update(['status' => 'sold']);
                
                // Create transaction
                $blockchainHash = '0x' . bin2hex(random_bytes(32));
                $transaction = Transaction::create([
                    'listing_id' => $listing->id,
                    'buyer_id' => $buyerId,
                    'payment_service_id' => (string) Str::uuid(),
                    'final_price' => $finalPrice,
                    'royalty_percentage' => number_format(rand(0, 1000) / 100, 2, '.', ''), // 0.00% to 10.00%
                    'blockchain_tx_hash' => $blockchainHash,
                ]);

                // If it was an auction, update bids
                if ($listing->listing_type === 'auction') {
                    $highestBid = $listing->bids()->orderByDesc('amount')->first();
                    if ($highestBid) {
                        $highestBid->update([
                            'status' => 'accepted',
                            'transaction_hash' => $blockchainHash,
                        ]);
                        
                        // Reject other bids
                        $listing->bids()
                            ->where('id', '!=', $highestBid->id)
                            ->where('status', 'pending')
                            ->update(['status' => 'rejected']);
                    }
                }
                
                $transactionCount++;
                
            } catch (Exception $e) {
                $this->command->error("Error creating transaction: " . $e->getMessage());
            }
        }

        // Create some expired auctions (for testing auction cleanup)
        $this->command->info('Creating some expired auctions...');
        for ($i = 0; $i < 3; $i++) {
            try {
                Listing::create([
                    'nft_contract_address' => $contractAddresses[array_rand($contractAddresses)],
                    'token_id' => (string) rand(20001, 25000),
                    'seller_id' => $userIds[array_rand($userIds)],
                    'listing_type' => 'auction',
                    'price' => number_format(rand(100, 1000) / 1000, 3, '.', ''),
                    'auction_end' => now()->subDays(rand(1, 5)), // Expired auctions
                    'status' => 'active',
                ]);
            } catch (\Exception $e) {
                $this->command->error("Error creating expired auction: " . $e->getMessage());
            }
        }

        $this->command->info('Validating data relationships...');

        try {
            // Verify bid->listing relationship
            $listingWithBids = Listing::has('bids')->first();
            assert($listingWithBids->bids->first()->listing_id === $listingWithBids->id);
            
            // Verify transaction->listing relationship 
            $soldListing = Listing::has('transaction')->first();
            assert($soldListing->transaction->listing_id === $soldListing->id);
            
            $this->command->info('✅ Data relationships validated successfully');
        } catch (\Throwable $e) {
            $this->command->error('❌ Relationship validation failed: '.$e->getMessage());
        }


        // Summary
        $this->command->info('');
        $this->command->info('=== Marketplace Seeder Completed Successfully! ===');
        $this->command->info('📋 Summary:');
        $this->command->info('- NFT Listings: ' . Listing::count());
        $this->command->info('  ↳ Active: ' . Listing::where('status', 'active')->count());
        $this->command->info('  ↳ Sold: ' . Listing::where('status', 'sold')->count());
        $this->command->info('  ↳ Fixed Price: ' . Listing::where('listing_type', 'fixed_price')->count());
        $this->command->info('  ↳ Auctions: ' . Listing::where('listing_type', 'auction')->count());
        $this->command->info('- Total Bids: ' . Bid::count());
        $this->command->info('  ↳ Pending: ' . Bid::where('status', 'pending')->count());
        $this->command->info('  ↳ Accepted: ' . Bid::where('status', 'accepted')->count());
        $this->command->info('  ↳ Rejected: ' . Bid::where('status', 'rejected')->count());
        $this->command->info('- Transactions: ' . Transaction::count());
        
        // Show some sample data
        $this->command->info('');
        $this->command->info('🎯 Sample Active Auctions:');
        $activeAuctions = Listing::where('listing_type', 'auction')
            ->where('status', 'active')
            ->where('auction_end', '>', now())
            ->with('bids')
            ->limit(3)
            ->get();
            
        foreach ($activeAuctions as $auction) {
            $highestBid = $auction->bids()->where('status', 'pending')->orderByDesc('amount')->first();
            $currentPrice = $highestBid ? $highestBid->amount : $auction->price;
            $this->command->info("  • Token #{$auction->token_id} - Current: {$currentPrice} ETH - Ends: {$auction->auction_end->diffForHumans()}");
        }
    }
}
