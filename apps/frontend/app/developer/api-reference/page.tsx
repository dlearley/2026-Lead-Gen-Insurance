'use client';

import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiReference() {
  return (
    <div className="bg-white min-h-screen">
      <SwaggerUI 
        url="http://localhost:3000/openapi.json" 
        deepLinking={true}
        displayOperationId={true}
      />
    </div>
  );
}
