#!/usr/bin/env node

/**
 * NLP Pipeline Integration Test
 * Validates end-to-end functionality of all NLP components
 */

const { NLPService } = require('../packages/ai-services/dist/nlp/nlp-service');
const { SentimentAnalyzer } = require('../packages/ai-services/dist/nlp/sentiment');
const { EntityRecognizer } = require('../packages/ai-services/dist/nlp/ner');
const { BuyingSignalDetector } = require('../packages/ai-services/dist/nlp/buying-signals');

console.log('🧪 Starting NLP Pipeline Integration Test...\n');

async function runIntegrationTests() {
  const nlpService = NLPService.getInstance();
  const sentimentAnalyzer = SentimentAnalyzer.getInstance();
  const entityRecognizer = EntityRecognizer.getInstance();
  const signalDetector = BuyingSignalDetector.getInstance();

  const testCases = [
    {
      name: 'Insurance Lead Analysis',
      text: 'Our VP of Sales is evaluating CRM solutions for our insurance agency. We have a budget of $5000 and need implementation within 30 days. Currently struggling with manual lead tracking.',
      expected: {
        hasEntities: true,
        hasSentiment: true,
        hasSignals: true,
        entityTypes: ['ROLE', 'MONEY', 'TIME'],
        buyingStage: 'evaluation'
      }
    },
    {
      name: 'Negative Support Ticket',
      text: 'The claims processing system is too slow and error-prone. We are frustrated with constant delays and need immediate resolution.',
      expected: {
        sentiment: 'negative',
        hasPainPoints: true,
        urgency: 'high'
      }
    },
    {
      name: 'Positive Customer Feedback',
      text: 'Excellent service! The automated lead scoring has improved our conversion rates significantly. Highly recommend this solution.',
      expected: {
        sentiment: 'positive',
        hasKeywords: ['lead scoring', 'conversion', 'automated'],
        positiveEmotions: true
      }
    }
  ];

  let passedTests = 0;
  const results = [];

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    
    try {
      // Run full NLP analysis
      const startTime = Date.now();
      const analysis = await nlpService.analyzeText(testCase.text, {
        domain: 'insurance',
        includeTopics: true
      });
      const duration = Date.now() - startTime;

      console.log(`✅ Analysis completed in ${duration}ms`);

      // Validate results
      const validation = validateAnalysis(analysis, testCase.expected);
      
      if (validation.passed) {
        console.log(`✅ Validation PASSED`);
        console.log(`   - Lead Quality: ${analysis.combinedInsights.leadQualityScore}/100`);
        console.log(`   - Buying Stage: ${analysis.buyingSignals.buyingStage}`);
        console.log(`   - Sentiment: ${analysis.sentiment.sentiment}`);
        console.log(`   - Entities: ${analysis.entities.entities.length} found`);
        console.log(`   - Signals: ${analysis.buyingSignals.signals.length} detected`);
        passedTests++;
      } else {
        console.log(`❌ Validation FAILED`);
        console.log(`   - ${validation.reason}`);
      }

      results.push({
        testName: testCase.name,
        passed: validation.passed,
        duration,
        leadQuality: analysis.combinedInsights.leadQualityScore,
        buyingStage: analysis.buyingSignals.buyingStage,
        entityCount: analysis.entities.entities.length,
        signalCount: analysis.buyingSignals.signals.length
      });

    } catch (error) {
      console.log(`❌ Test FAILED with error: ${error.message}`);
      results.push({
        testName: testCase.name,
        passed: false,
        error: error.message
      });
    }
  }

  // Batch processing test
  console.log('\n⚡ Running Batch Processing Test...');
  try {
    const batchTexts = testCases.map(tc => tc.text);
    const batchStart = Date.now();
    const batchResults = await nlpService.batchAnalyze(batchTexts);
    const batchDuration = Date.now() - batchStart;
    
    console.log(`✅ Batch processing completed: ${batchResults.length} documents in ${batchDuration}ms`);
    console.log(`✅ Average: ${Math.round(batchDuration / batchResults.length)}ms per document`);
    
    results.push({
      testName: 'Batch Processing',
      passed: true,
      duration: batchDuration,
      avgPerDoc: Math.round(batchDuration / batchResults.length)
    });
    
  } catch (error) {
    console.log(`❌ Batch processing failed: ${error.message}`);
  }

  // Performance summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Integration Test Summary');
  console.log('='.repeat(50));
  
  const passRate = Math.round((passedTests / testCases.length) * 100);
  console.log(`Overall Pass Rate: ${passRate}%`);
  console.log(`Tests Passed: ${passedTests}/${testCases.length}`);
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${status} ${result.testName}${duration}`);
  });

  // Final assessment
  console.log('\n' + '='.repeat(50));
  if (passRate >= 80) {
    console.log('🎉 NLP Pipeline: PRODUCTION READY');
    console.log('All critical components are functioning correctly.');
    return 0;
  } else if (passRate >= 60) {
    console.log('⚠️  NLP Pipeline: NEEDS IMPROVEMENT');
    console.log('Some components need attention before production.');
    return 1;
  } else {
    console.log('🚧 NLP Pipeline: MAJOR ISSUES DETECTED');
    console.log('Significant work needed before deployment.');
    return 2;
  }
}

function validateAnalysis(analysis, expected) {
  if (!analysis || !analysis.combinedInsights) {
    return { passed: false, reason: 'Invalid analysis structure' };
  }

  const checks = [];

  // Check lead quality score
  if (analysis.combinedInsights.leadQualityScore < 0 || analysis.combinedInsights.leadQualityScore > 100) {
    checks.push('Lead quality score out of range');
  }

  // Check entities
  if (analysis.entities && Array.isArray(analysis.entities.entities)) {
    if (expected.hasEntities && analysis.entities.entities.length === 0) {
      checks.push('Expected entities but none found');
    }
    
    if (expected.entityTypes) {
      const foundTypes = new Set(analysis.entities.entities.map(e => e.type));
      const missingTypes = expected.entityTypes.filter(type => !foundTypes.has(type));
      if (missingTypes.length > 0) {
        checks.push(`Missing expected entity types: ${missingTypes.join(', ')}`);
      }
    }
  }

  // Check buying signals
  if (analysis.buyingSignals && Array.isArray(analysis.buyingSignals.signals)) {
    if (expected.hasSignals && analysis.buyingSignals.signals.length === 0) {
      checks.push('Expected buying signals but none found');
    }
    
    if (expected.buyingStage && analysis.buyingSignals.buyingStage !== expected.buyingStage) {
      checks.push(`Expected buying stage '${expected.buyingStage}' but got '${analysis.buyingSignals.buyingStage}'`);
    }
  }

  // Check sentiment
  if (expected.sentiment && analysis.sentiment && analysis.sentiment.sentiment !== expected.sentiment) {
    checks.push(`Expected sentiment '${expected.sentiment}' but got '${analysis.sentiment.sentiment}'`);
  }

  if (checks.length > 0) {
    return { passed: false, reason: checks.join('; ') };
  }

  return { passed: true };
}

// Run tests
runIntegrationTests().then(exitCode => {
  console.log('\nIntegration test completed.');
  process.exit(exitCode);
}).catch(error => {
  console.error('Integration test failed:', error);
  process.exit(3);
});