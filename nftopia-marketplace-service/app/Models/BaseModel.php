<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BaseModel extends Model
{
    protected function newBaseQueryBuilder()
    {
        $builder = parent::newBaseQueryBuilder();
        
        // Set the schema for all queries
        if ($schema = env('DB_SCHEMA')) {
            $builder->from($schema . '.' . $this->getTable());
        }

        return $builder;
    }
}