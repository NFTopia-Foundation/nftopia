<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBidRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'bidder_id' => 'required|uuid',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'required|string',
        ];
    }
}
