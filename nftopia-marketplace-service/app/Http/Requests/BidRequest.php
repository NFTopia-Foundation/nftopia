<?php

namespace App\Http\Controllers\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BidRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'listing_id' => 'required|uuid|exists:nft_listings,id',
            'bidder_id' => 'required|uuid',
            'amount' => ['required', 'numeric', 'regex:/^\d+(\.\d{1,18})?$/'],
        ];
    }
}