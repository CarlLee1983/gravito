import { describe, expect, it } from 'bun:test'
import { createMetricAggregator } from '../../../../src/Domain/DCI/Roles/MetricAggregatorRole'
import { DataPoint } from '../../../../src/Domain/Entities/DataPoint'
import { DataPointValue } from '../../../../src/Domain/ValueObjects/DataPointValue'
import { MetricName } from '../../../../src/Domain/ValueObjects/MetricName'

describe('MetricAggregatorRole', () => {
  it('sum() 求和', () => {
    const agg = createMetricAggregator()
    const metricName = MetricName.of('test.metric')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(200), new Date(), 'event'),
      DataPoint.create('dp-3', metricName, DataPointValue.of(300), new Date(), 'event'),
    ]
    expect(agg.sum(dps)).toBe(600)
  })

  it('sum() 空陣列', () => {
    const agg = createMetricAggregator()
    expect(agg.sum([])).toBe(0)
  })

  it('average() 平均值', () => {
    const agg = createMetricAggregator()
    const metricName = MetricName.of('test.metric')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    expect(agg.average(dps)).toBe(150)
  })

  it('average() 空陣列', () => {
    const agg = createMetricAggregator()
    expect(agg.average([])).toBe(0)
  })

  it('count() 計數', () => {
    const agg = createMetricAggregator()
    const metricName = MetricName.of('test.metric')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(1), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(1), new Date(), 'event'),
      DataPoint.create('dp-3', metricName, DataPointValue.of(1), new Date(), 'event'),
    ]
    expect(agg.count(dps)).toBe(3)
  })

  it('min() 最小值', () => {
    const agg = createMetricAggregator()
    const metricName = MetricName.of('test.metric')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(50), new Date(), 'event'),
      DataPoint.create('dp-3', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    expect(agg.min(dps)).toBe(50)
  })

  it('max() 最大值', () => {
    const agg = createMetricAggregator()
    const metricName = MetricName.of('test.metric')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(50), new Date(), 'event'),
      DataPoint.create('dp-3', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    expect(agg.max(dps)).toBe(200)
  })

  it('aggregate() SUM', () => {
    const agg = createMetricAggregator()
    const metricName = MetricName.of('test.metric')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    expect(agg.aggregate(dps, 'SUM')).toBe(300)
  })

  it('aggregate() AVG', () => {
    const agg = createMetricAggregator()
    const metricName = MetricName.of('test.metric')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(100), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(200), new Date(), 'event'),
    ]
    expect(agg.aggregate(dps, 'AVG')).toBe(150)
  })

  it('aggregate() COUNT', () => {
    const agg = createMetricAggregator()
    const metricName = MetricName.of('test.metric')
    const dps = [
      DataPoint.create('dp-1', metricName, DataPointValue.of(1), new Date(), 'event'),
      DataPoint.create('dp-2', metricName, DataPointValue.of(1), new Date(), 'event'),
    ]
    expect(agg.aggregate(dps, 'COUNT')).toBe(2)
  })

  it('groupByInterval() 時間分組', () => {
    const agg = createMetricAggregator()
    const metricName = MetricName.of('test.metric')
    const baseTime = new Date('2026-02-28T00:00:00Z').getTime()
    const dps = [
      DataPoint.create(
        'dp-1',
        metricName,
        DataPointValue.of(100),
        new Date(baseTime + 1000),
        'event'
      ),
      DataPoint.create(
        'dp-2',
        metricName,
        DataPointValue.of(200),
        new Date(baseTime + 2000),
        'event'
      ),
      DataPoint.create(
        'dp-3',
        metricName,
        DataPointValue.of(300),
        new Date(baseTime + 3600000 + 1000),
        'event'
      ),
    ]
    const result = agg.groupByInterval(dps, 3600000, 'SUM')
    expect(result).toHaveLength(2)
    expect(result[0]!.value).toBe(300)
    expect(result[1]!.value).toBe(300)
  })

  it('groupByInterval() 空陣列', () => {
    const agg = createMetricAggregator()
    const result = agg.groupByInterval([], 3600000, 'SUM')
    expect(result).toHaveLength(0)
  })
})
