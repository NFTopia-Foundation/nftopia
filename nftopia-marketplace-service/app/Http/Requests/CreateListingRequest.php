<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateListingRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $minPrice = config('marketplace.min_listing_price', 0.01);
        return [
            'nft_contract_address' => 'required|string|size:42',
            'token_id' => 'required|string',
            'seller_id' => 'required|uuid|exists:users,id',
            'listing_type' => 'required|in:fixed_price,auction',
            'price' => "required|numeric|min:{$minPrice}",
            'auction_end' => 'nullable|date|after:now',
            'metadata' => 'nullable|array',
        ];
    }

    protected function prepareForValidation()
    {
        $this->merge([
            'seller_id' => auth()->id() ?? $this->input('seller_id'),
        ]);
    }
}
