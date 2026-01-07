# CSV Import Templates

This directory contains CSV templates for importing lead data into the system.

## Lead Import Template

**File:** `lead_import_template.csv`

### Required Fields

- **firstName**: Lead's first name (required)
- **lastName**: Lead's last name (required)
- **email**: Valid email address (required if no phone)
- **phone**: Valid phone number (required if no email)

### Optional Fields

- **street**: Street address
- **city**: City name
- **state**: State/Province code (e.g., IL, CA, NY)
- **zipCode**: Postal/ZIP code
- **country**: Country code (e.g., USA, CAN)
- **insuranceType**: Type of insurance interest
  - Valid values: AUTO, HOME, LIFE, HEALTH, COMMERCIAL, RENTERS, UMBRELLA, DISABILITY, LONG_TERM_CARE, PET
- **currentProvider**: Current insurance provider name
- **policyExpiryDate**: Policy expiration date (format: YYYY-MM-DD)
- **dateOfBirth**: Date of birth (format: YYYY-MM-DD)
- **urgency**: Lead urgency level
  - Valid values: LOW, MEDIUM, HIGH, CRITICAL
  - Default: MEDIUM

## Data Format Requirements

### Email
- Must be a valid email address format
- Example: john.doe@example.com

### Phone
- Can include country code, area code, and formatting characters
- Examples:
  - +1-555-0100
  - (555) 123-4567
  - 555.123.4567
  - 5551234567

### Date Fields
- Must be in ISO 8601 format: YYYY-MM-DD
- Examples:
  - 2025-12-31
  - 1985-05-15

### Insurance Type
- Must be one of the valid values (case-insensitive)
- AUTO, HOME, LIFE, HEALTH, COMMERCIAL, RENTERS, UMBRELLA, DISABILITY, LONG_TERM_CARE, PET

### Urgency
- Must be one of the valid values (case-insensitive)
- LOW, MEDIUM, HIGH, CRITICAL

## File Format

- **Encoding**: UTF-8
- **Delimiter**: Comma (,)
- **Quote Character**: Double quote (")
- **Line Endings**: LF or CRLF
- **Header Row**: Required (first row)
- **Max File Size**: 10 MB
- **Max Rows**: Unlimited (processed in batches of 100)

## Example Data

```csv
firstName,lastName,email,phone,street,city,state,zipCode,country,insuranceType,currentProvider,policyExpiryDate,dateOfBirth,urgency
John,Doe,john.doe@example.com,+1-555-0100,123 Main St,Springfield,IL,62701,USA,AUTO,State Farm,2025-12-31,1985-05-15,MEDIUM
Jane,Smith,jane.smith@example.com,+1-555-0101,456 Oak Ave,Chicago,IL,60601,USA,HOME,Allstate,2025-06-30,1990-08-22,HIGH
```

## Import Process

1. **Download Template**: Use the provided `lead_import_template.csv`
2. **Fill Data**: Add your lead data following the format requirements
3. **Upload**: Use the import interface to upload your CSV file
4. **Preview**: Review the detected fields and suggested mappings
5. **Map Fields**: Confirm or adjust field mappings
6. **Validate**: Check for validation warnings and errors
7. **Import**: Start the import process
8. **Monitor**: Track import progress and review results

## Common Issues & Solutions

### Issue: Invalid Email Format
**Solution**: Ensure emails follow the format: name@domain.com

### Issue: Invalid Phone Number
**Solution**: Use standard phone formats with or without country code

### Issue: Invalid Date Format
**Solution**: Use YYYY-MM-DD format (e.g., 2025-12-31)

### Issue: Invalid Insurance Type
**Solution**: Use only the valid values listed above (case-insensitive)

### Issue: Missing Required Field
**Solution**: Ensure either email or phone is provided for each row

### Issue: Duplicate Detection
**Solution**: Review duplicates before import. System matches by:
- Email (exact match)
- Phone (normalized match)
- Name + Address (fuzzy match, 85% threshold)

## Data Cleansing

The system automatically cleanses imported data:

- **Email**: Converted to lowercase, trimmed
- **Phone**: Normalized to +1XXXXXXXXXX format (US numbers)
- **Names**: Capitalized (e.g., john → John)
- **Strings**: Trimmed whitespace
- **Special Characters**: Optional removal

## Validation Rules

### Email Validation
- Format: RFC 5322 standard
- Must contain @ symbol
- Valid domain name

### Phone Validation
- Length: 10-15 digits (after removing non-digits)
- US numbers: 10 digits with optional +1 country code

### Required Field Validation
- At least one contact method (email OR phone)
- First name and last name recommended

### Enum Validation
- Insurance type must match valid values
- Urgency must match valid values
- Case-insensitive matching

## Tips for Best Results

1. **Use the Template**: Start with the provided template file
2. **Clean Your Data**: Remove duplicates before importing
3. **Validate First**: Review the preview before importing
4. **Small Batches**: Start with small files (< 1000 rows) for testing
5. **Monitor Progress**: Watch the import progress in real-time
6. **Review Errors**: Check error reports and retry failed records
7. **Backup Data**: Keep a copy of your source data

## Historical Data Import

For importing large historical datasets:

- **Batch Size**: System processes in batches of 100 records
- **Scheduling**: Schedule imports for off-peak hours
- **History Window**: Can import up to 5 years of historical data
- **Progress Tracking**: Real-time progress updates
- **Error Recovery**: Failed records can be retried individually

## Support

For questions or issues:
- Check validation errors in the import preview
- Review the import error log
- Contact support with your import job ID
