<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Http;

class PlaceBidRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'amount' => 'required|numeric',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $listing = $this->route('listing');
            if ($listing->listing_type !== 'auction') {
                $validator->errors()->add('listing_type', 'Only auction listings accept bids.');
                return;
            }
            if ($listing->auction_end && now()->greaterThan($listing->auction_end)) {
                $validator->errors()->add('auction_end', 'Auction has ended.');
                return;
            }
            $highestBid = $listing->bids()->orderByDesc('amount')->first();
            $minBid = $highestBid ? $highestBid->amount + 0.01 : $listing->price;
            if ($this->input('amount') <= $minBid) {
                $validator->errors()->add('amount', "Bid must be greater than current highest bid ({$minBid}).");
            }
            // Ownership verification (mocked, adjust as needed)
            $response = Http::post(config('services.nftopia_onchain.url') . '/verify-ownership', [
                'nft_contract_address' => $listing->nft_contract_address,
                'token_id' => $listing->token_id,
                'owner_id' => $this->input('bidder_id', auth()->id()),
            ]);
            if (!$response->json('owned')) {
                $validator->errors()->add('ownership', 'You do not own this NFT or are not authorized.');
            }
        });
    }
}
