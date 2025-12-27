# Referral Program API Documentation

## 📖 Overview

The Referral Program API provides endpoints for managing partners, referrals, and rewards in the Insurance Lead Generation AI Platform. This API enables partner-driven growth through a comprehensive referral system.

## 🔐 Authentication

All endpoints require JWT authentication. Include the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🎯 Partner Management

### Create Partner

**POST** `/api/v1/partners`

**Roles:** `ADMIN`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  "companyName": "Insurance Partners Inc",
  "commissionRate": 0.15,
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "id": "partner-id",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  "companyName": "Insurance Partners Inc",
  "referralCode": "JOHDOE1234",
  "status": "ACTIVE",
  "commissionRate": 0.15,
  "totalReferrals": 0,
  "successfulReferrals": 0,
  "totalEarnings": 0.0,
  "createdAt": "2023-12-27T10:00:00.000Z",
  "updatedAt": "2023-12-27T10:00:00.000Z"
}
```

### Get Partner by ID

**GET** `/api/v1/partners/{id}`

**Roles:** `ADMIN`, `PARTNER`

**Response:** Partner object

### Get Partner by Email

**GET** `/api/v1/partners/email/{email}`

**Roles:** `ADMIN`

**Response:** Partner object

### Get Partner by Referral Code

**GET** `/api/v1/partners/referral-code/{referralCode}`

**Roles:** `ADMIN`, `PARTNER`

**Response:** Partner object

### List Partners

**GET** `/api/v1/partners`

**Roles:** `ADMIN`

**Query Parameters:**
- `status`: Filter by status (active, inactive, suspended, terminated)
- `search`: Search term for name, email, or company
- `dateFrom`: Filter by creation date (from)
- `dateTo`: Filter by creation date (to)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": "partner-id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "referralCode": "JOHDOE1234",
      "status": "ACTIVE",
      "commissionRate": 0.15,
      "totalReferrals": 10,
      "successfulReferrals": 5,
      "totalEarnings": 750.0
    }
  ],
  "total": 1
}
```

### Update Partner

**PUT** `/api/v1/partners/{id}`

**Roles:** `ADMIN`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "9876543210",
  "companyName": "Updated Company",
  "commissionRate": 0.2,
  "status": "active"
}
```

**Response:** Updated partner object

### Delete Partner

**DELETE** `/api/v1/partners/{id}`

**Roles:** `ADMIN`

**Response:** Deleted partner object (status changed to TERMINATED)

### Validate Referral Code

**GET** `/api/v1/partners/validate-referral-code/{referralCode}`

**Roles:** Public (no auth required)

**Response:**
```json
{
  "valid": true
}
```

### Get Partner Performance

**GET** `/api/v1/partners/{id}/performance`

**Roles:** `ADMIN`, `PARTNER`

**Response:**
```json
{
  "partnerId": "partner-id",
  "partnerName": "John Doe",
  "totalReferrals": 10,
  "successfulReferrals": 5,
  "conversionRate": 0.5,
  "totalEarnings": 750.0,
  "averageEarningsPerReferral": 150.0,
  "status": "ACTIVE"
}
```

### Get Partner Statistics

**GET** `/api/v1/partners/statistics`

**Roles:** `ADMIN`

**Response:**
```json
{
  "totalPartners": 50,
  "activePartners": 45,
  "totalReferrals": 1000,
  "successfulReferrals": 300,
  "totalEarnings": 45000.0,
  "averageReferralsPerPartner": 20,
  "conversionRate": 0.3
}
```

### Get Top Partners

**GET** `/api/v1/partners/top`

**Roles:** `ADMIN`

**Query Parameters:**
- `limit`: Number of top partners to return (default: 10)

**Response:** Array of partner objects sorted by successful referrals

## 🔄 Referral Management

### Create Referral

**POST** `/api/v1/referrals`

**Roles:** `ADMIN`, `PARTNER`

**Request Body:**
```json
{
  "partnerId": "partner-id",
  "referralCode": "JOHDOE1234",
  "source": "website",
  "leadId": "optional-lead-id",
  "notes": "Referred through contact form"
}
```

**Response:**
```json
{
  "id": "referral-id",
  "partnerId": "partner-id",
  "leadId": null,
  "referralCode": "JOHDOE1234",
  "source": "WEBSITE",
  "status": "PENDING",
  "referredAt": "2023-12-27T10:00:00.000Z",
  "acceptedAt": null,
  "rejectedAt": null,
  "convertedAt": null,
  "conversionValue": null,
  "notes": "Referred through contact form",
  "partner": {
    "id": "partner-id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  }
}
```

### Get Referral by ID

**GET** `/api/v1/referrals/{id}`

**Roles:** `ADMIN`, `PARTNER`

**Response:** Referral object

### Get Referrals by Partner

**GET** `/api/v1/referrals/partner/{partnerId}`

**Roles:** `ADMIN`, `PARTNER`

**Response:** Array of referral objects

### Get Referral by Lead

**GET** `/api/v1/referrals/lead/{leadId}`

**Roles:** `ADMIN`, `PARTNER`

**Response:** Referral object

### Get Referrals by Referral Code

**GET** `/api/v1/referrals/referral-code/{referralCode}`

**Roles:** `ADMIN`, `PARTNER`

**Response:** Array of referral objects

### List Referrals

**GET** `/api/v1/referrals`

**Roles:** `ADMIN`

**Query Parameters:**
- `partnerId`: Filter by partner ID
- `leadId`: Filter by lead ID
- `status`: Filter by status (pending, accepted, rejected, converted, paid, expired)
- `source`: Filter by source (website, mobile_app, email, phone, in_person, social_media, other)
- `search`: Search term for referral code or notes
- `dateFrom`: Filter by referral date (from)
- `dateTo`: Filter by referral date (to)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": "referral-id",
      "partnerId": "partner-id",
      "referralCode": "JOHDOE1234",
      "source": "WEBSITE",
      "status": "PENDING",
      "referredAt": "2023-12-27T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

### Update Referral

**PUT** `/api/v1/referrals/{id}`

**Roles:** `ADMIN`, `PARTNER`

**Request Body:**
```json
{
  "status": "ACCEPTED",
  "leadId": "lead-id",
  "notes": "Updated notes",
  "conversionValue": 1000.0
}
```

**Response:** Updated referral object

### Link Referral to Lead

**POST** `/api/v1/referrals/{id}/link-to-lead`

**Roles:** `ADMIN`

**Request Body:**
```json
{
  "leadId": "lead-id"
}
```

**Response:** Updated referral object with lead linked

### Process Referral Conversion

**POST** `/api/v1/referrals/{id}/process-conversion`

**Roles:** `ADMIN`

**Request Body:**
```json
{
  "conversionValue": 1000.0
}
```

**Response:**
```json
{
  "referral": {
    "id": "referral-id",
    "status": "CONVERTED",
    "conversionValue": 1000.0,
    "convertedAt": "2023-12-27T10:00:00.000Z"
  },
  "reward": {
    "id": "reward-id",
    "partnerId": "partner-id",
    "referralId": "referral-id",
    "amount": 150.0,
    "status": "CALCULATED"
  }
}
```

### Delete Referral

**DELETE** `/api/v1/referrals/{id}`

**Roles:** `ADMIN`

**Response:** Deleted referral object

### Get Referral Statistics

**GET** `/api/v1/referrals/statistics`

**Roles:** `ADMIN`

**Response:**
```json
{
  "totalReferrals": 1000,
  "pendingReferrals": 200,
  "acceptedReferrals": 300,
  "convertedReferrals": 400,
  "rejectedReferrals": 100,
  "conversionRate": 0.4,
  "acceptanceRate": 0.9
}
```

### Get Referral Statistics by Partner

**GET** `/api/v1/referrals/statistics/partner/{partnerId}`

**Roles:** `ADMIN`, `PARTNER`

**Response:**
```json
{
  "partnerId": "partner-id",
  "totalReferrals": 50,
  "convertedReferrals": 15,
  "conversionRate": 0.3,
  "totalEarnings": 2250.0
}
```

### Get Referral Source Distribution

**GET** `/api/v1/referrals/source-distribution`

**Roles:** `ADMIN`

**Response:**
```json
{
  "WEBSITE": 400,
  "MOBILE_APP": 200,
  "EMAIL": 150,
  "PHONE": 100,
  "IN_PERSON": 50,
  "SOCIAL_MEDIA": 75,
  "OTHER": 25
}
```

### Get Conversion Analytics

**GET** `/api/v1/referrals/conversion-analytics`

**Roles:** `ADMIN`

**Response:**
```json
{
  "totalReferrals": 1000,
  "pendingReferrals": 200,
  "acceptedReferrals": 300,
  "convertedReferrals": 400,
  "rejectedReferrals": 100,
  "conversionRate": 0.4,
  "acceptanceRate": 0.9,
  "sourceDistribution": {
    "WEBSITE": 400,
    "MOBILE_APP": 200
  },
  "conversionTrends": {
    "daily": [],
    "weekly": [],
    "monthly": []
  }
}
```

### Check Expired Referrals

**POST** `/api/v1/referrals/check-expired`

**Roles:** `ADMIN`

**Request Body:**
```json
{
  "expiryDays": 30
}
```

**Response:**
```json
{
  "expiredReferrals": 50
}
```

## 💰 Reward Management

### Create Reward

**POST** `/api/v1/rewards`

**Roles:** `ADMIN`

**Request Body:**
```json
{
  "partnerId": "partner-id",
  "referralId": "referral-id",
  "amount": 150.0,
  "currency": "USD",
  "notes": "Manual reward creation"
}
```

**Response:** Reward object

### Get Reward by ID

**GET** `/api/v1/rewards/{id}`

**Roles:** `ADMIN`, `PARTNER`

**Response:** Reward object

### Get Rewards by Partner

**GET** `/api/v1/rewards/partner/{partnerId}`

**Roles:** `ADMIN`, `PARTNER`

**Response:** Array of reward objects

### Get Reward by Referral

**GET** `/api/v1/rewards/referral/{referralId}`

**Roles:** `ADMIN`, `PARTNER`

**Response:** Reward object

### List Rewards

**GET** `/api/v1/rewards`

**Roles:** `ADMIN`

**Query Parameters:**
- `partnerId`: Filter by partner ID
- `referralId`: Filter by referral ID
- `status`: Filter by status (pending, calculated, approved, paid, cancelled)
- `search`: Search term for notes or transaction ID
- `dateFrom`: Filter by calculation date (from)
- `dateTo`: Filter by calculation date (to)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": "reward-id",
      "partnerId": "partner-id",
      "referralId": "referral-id",
      "amount": 150.0,
      "currency": "USD",
      "status": "CALCULATED",
      "calculatedAt": "2023-12-27T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

### Update Reward

**PUT** `/api/v1/rewards/{id}`

**Roles:** `ADMIN`

**Request Body:**
```json
{
  "status": "APPROVED",
  "amount": 150.0,
  "paymentMethod": "BANK_TRANSFER",
  "transactionId": "TXN-12345",
  "notes": "Approved for payment"
}
```

**Response:** Updated reward object

### Calculate Reward

**POST** `/api/v1/rewards/{id}/calculate`

**Roles:** `ADMIN`

**Request Body:**
```json
{
  "conversionValue": 1000.0
}
```

**Response:** Reward object with calculated amount

### Process Reward Payment

**POST** `/api/v1/rewards/{id}/process-payment`

**Roles:** `ADMIN`

**Request Body:**
```json
{
  "paymentMethod": "PAYPAL",
  "transactionId": "PAY-67890"
}
```

**Response:** Reward object with PAID status

### Delete Reward

**DELETE** `/api/v1/rewards/{id}`

**Roles:** `ADMIN`

**Response:** Deleted reward object

### Get Reward Statistics

**GET** `/api/v1/rewards/statistics`

**Roles:** `ADMIN`

**Response:**
```json
{
  "totalRewards": 300,
  "pendingRewards": 50,
  "paidRewards": 200,
  "totalAmount": 30000.0,
  "averageReward": 150.0
}
```

### Get Reward Statistics by Partner

**GET** `/api/v1/rewards/statistics/partner/{partnerId}`

**Roles:** `ADMIN`, `PARTNER`

**Response:**
```json
{
  "partnerId": "partner-id",
  "totalRewards": 15,
  "paidRewards": 10,
  "totalAmount": 1500.0,
  "averageReward": 150.0
}
```

### Get Reward Status Distribution

**GET** `/api/v1/rewards/status-distribution`

**Roles:** `ADMIN`

**Response:**
```json
{
  "PENDING": 50,
  "CALCULATED": 100,
  "APPROVED": 75,
  "PAID": 200,
  "CANCELLED": 10
}
```

### Get Pending Rewards

**GET** `/api/v1/rewards/pending`

**Roles:** `ADMIN`

**Response:** Array of pending reward objects

### Get Payment Summary

**GET** `/api/v1/rewards/payment-summary`

**Roles:** `ADMIN`

**Response:**
```json
{
  "totalRewards": 300,
  "pendingRewards": 50,
  "paidRewards": 200,
  "totalAmount": 30000.0,
  "averageReward": 150.0,
  "statusDistribution": {
    "PENDING": 50,
    "CALCULATED": 100
  },
  "pendingPaymentAmount": 7500.0
}
```

### Bulk Approve Rewards

**POST** `/api/v1/rewards/bulk-approve`

**Roles:** `ADMIN`

**Request Body:**
```json
{
  "rewardIds": ["reward-id-1", "reward-id-2"]
}
```

**Response:**
```json
{
  "approvedCount": 2
}
```

### Get Payout History

**GET** `/api/v1/rewards/payout-history`

**Roles:** `ADMIN`

**Query Parameters:**
- `partnerId`: Filter by partner ID (optional)
- `limit`: Number of records to return (default: 50)

**Response:** Array of paid reward objects

## 📊 Error Handling

All endpoints follow a consistent error response format:

### Validation Errors (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Authentication Errors (401)
```json
{
  "success": false,
  "message": "Please authenticate",
  "error": "Authentication required"
}
```

### Authorization Errors (403)
```json
{
  "success": false,
  "message": "Forbidden",
  "error": "Unauthorized - insufficient permissions"
}
```

### Not Found Errors (404)
```json
{
  "success": false,
  "message": "Not found",
  "error": "Partner not found"
}
```

### Server Errors (500)
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Failed to create partner"
}
```

## 🎯 Usage Examples

### Partner Onboarding Flow

```bash
# 1. Create a new partner
POST /api/v1/partners
{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "email": "sarah@example.com",
  "phone": "5551234567",
  "companyName": "Johnson Insurance Partners"
}

# 2. Get partner details to retrieve referral code
GET /api/v1/partners/{partnerId}

# 3. Partner can now share their referral code
```

### Referral Processing Flow

```bash
# 1. Create referral when lead is referred
POST /api/v1/referrals
{
  "partnerId": "partner-id",
  "referralCode": "SARJOH1234",
  "source": "website"
}

# 2. Link referral to lead when lead is created
POST /api/v1/referrals/{referralId}/link-to-lead
{
  "leadId": "lead-id"
}

# 3. Process conversion when lead converts
POST /api/v1/referrals/{referralId}/process-conversion
{
  "conversionValue": 2500.0
}

# 4. Process reward payment
POST /api/v1/rewards/{rewardId}/process-payment
{
  "paymentMethod": "BANK_TRANSFER",
  "transactionId": "BANK-12345"
}
```

### Partner Portal Flow

```bash
# 1. Partner logs in and gets their profile
GET /api/v1/partners/{partnerId}

# 2. Partner views their referrals
GET /api/v1/referrals/partner/{partnerId}

# 3. Partner views their earnings
GET /api/v1/rewards/partner/{partnerId}

# 4. Partner views their performance
GET /api/v1/partners/{partnerId}/performance
```

## 🔧 Integration Guide

### Webhook Integration

To integrate with external systems, set up webhooks to listen for referral events:

```javascript
// Example: Listen for referral creation webhook
app.post('/webhooks/referral-created', (req, res) => {
  const { referralId, partnerId, referralCode, source } = req.body;
  
  // Process the referral in your system
  // Send confirmation email to partner
  // Update CRM records
  
  res.status(200).json({ success: true });
});
```

### Frontend Integration

```javascript
// Example: Create referral from frontend
async function createReferral(partnerId, referralCode) {
  const response = await fetch('/api/v1/referrals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      partnerId,
      referralCode,
      source: 'website'
    })
  });
  
  return await response.json();
}
```

### Mobile App Integration

```swift
// Example: Validate referral code in mobile app
func validateReferralCode(code: String, completion: @escaping (Bool) -> Void) {
    let url = URL(string: "/api/v1/partners/validate-referral-code/" + code)!
    
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        if let data = data {
            let result = try? JSONDecoder().decode(ValidationResponse.self, from: data)
            completion(result?.valid ?? false)
        }
    }.resume()
}
```

## 📈 Best Practices

### Performance Optimization

1. **Use pagination** for listing endpoints to avoid large payloads
2. **Cache frequently accessed data** like partner statistics
3. **Use filtering** to retrieve only necessary data
4. **Batch operations** for bulk updates

### Security

1. **Always use HTTPS** for API communication
2. **Validate all inputs** on both client and server
3. **Use proper authentication** with JWT tokens
4. **Implement rate limiting** to prevent abuse
5. **Log all sensitive operations** for audit purposes

### Error Handling

1. **Handle errors gracefully** in frontend applications
2. **Provide user-friendly error messages**
3. **Implement retry logic** for transient failures
4. **Monitor error rates** for API health

### Data Management

1. **Regularly backup** referral and reward data
2. **Archive old records** to maintain performance
3. **Monitor data growth** and scale accordingly
4. **Validate data integrity** periodically

## 🎓 Support

For issues or questions about the Referral Program API:

- **Documentation**: Refer to this API documentation
- **Support Email**: support@insurance-lead-gen.com
- **Developer Portal**: https://developer.insurance-lead-gen.com
- **Status Page**: https://status.insurance-lead-gen.com

## 📝 Changelog

### Version 1.0.0
- Initial release of Referral Program API
- Full partner management functionality
- Complete referral lifecycle support
- Comprehensive reward system
- Analytics and reporting endpoints

### Version 1.1.0 (Planned)
- Enhanced analytics with time-series data
- Partner tier system
- Multi-currency support
- Advanced filtering options
- Webhook notifications

This API documentation provides comprehensive coverage of all referral program endpoints and their usage.