<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreListingRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'nft_id' => 'required|uuid',
            'seller_id' => 'required|uuid',
            'type' => 'required|in:fixed_price,auction',
            'price' => 'required|numeric|min:0.01',
            'auction_end' => 'nullable|date|after:now',
            'royalty_percentage' => 'required|numeric|min:0|max:100',
        ];
    }
}
