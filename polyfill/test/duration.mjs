import Demitasse from '@pipobscure/demitasse';
const { describe, it, report } = Demitasse;

import Pretty from '@pipobscure/demitasse-pretty';
const { reporter } = Pretty;

import { strict as assert } from 'assert';
const { throws, equal } = assert;

import { Duration } from 'tc39-temporal';

describe('Duration', () => {
  describe('Construction', () => {
    describe('Disambiguation', () => {
      it('negative values throw when "reject"', () =>
        throws(() => new Duration(-1, -1, -1, -1, -1, -1, -1, -1, -1, 'reject'), RangeError));
      it('negative values invert when "constrain"', () =>
        equal(`${new Duration(-1, -1, -1, -1, -1, -1, -1, -1, -1, 'constrain')}`, 'P1Y1M1DT1H1M1.001001001S'));
      it('excessive time units balance when "balance"', () => {
        equal(`${new Duration(0, 0, 0, 0, 0, 0, 0, 0, 1000, 'balance')}`, 'PT0.000001S');
        equal(`${new Duration(0, 0, 0, 0, 0, 0, 0, 1000, 0, 'balance')}`, 'PT0.001S');
        equal(`${new Duration(0, 0, 0, 0, 0, 0, 1000, 0, 0, 'balance')}`, 'PT1S');
        equal(`${new Duration(0, 0, 0, 0, 0, 100, 0, 0, 0, 'balance')}`, 'PT1M40S');
        equal(`${new Duration(0, 0, 0, 0, 100, 0, 0, 0, 0, 'balance')}`, 'PT1H40M');
      });
      it('excessive date units do not balance when "balance"', () => {
        equal(`${new Duration(0, 12, 0, 0, 0, 0, 0, 0, 0, 'balance')}`, 'P12M');
        equal(`${new Duration(0, 12, 0, 0, 0, 3600, 0, 0, 0, 'balance')}`, 'P12MT1H');
        equal(`${new Duration(0, 0, 31, 0, 0, 0, 0, 0, 0, 'balance')}`, 'P31D');
        equal(`${new Duration(0, 0, 31, 0, 0, 3600, 0, 0, 0, 'balance')}`, 'P31DT1H');
        equal(`${new Duration(0, 0, 0, 24, 0, 0, 0, 0, 0, 'balance')}`, 'PT24H');
        equal(`${new Duration(0, 0, 0, 0, 0, 2 * 86400, 0, 0, 0, 'balance')}`, 'PT48H');
        equal(`${new Duration(0, 0, 0, 24, 0, 3600, 0, 0, 0, 'balance')}`, 'PT25H');
      });
      it('throw when bad disambiguation', () =>
        throws(() => new Duration(0, 0, 0, 0, 0, 0, 0, 0, 0, 'xyz'), TypeError));
    });
  });
  describe('from()', () => {
    it(`Duration.from(P5Y) == P5Y`, () => {
      const orig = new Duration(5);
      const from = Duration.from(orig);
      equal(from, orig);
    });
    it(`Duration.from({ milliseconds: 5 }) == PT0.005S`, () => equal(`${ Duration.from({ milliseconds: 5 }) }`, 'PT0.005S'));
    it(`Duration.from("P1D") == P1D`, () => equal(`${ Duration.from("P1D") }`, 'P1D'));
    it('Duration.from({}) throws', () => throws(() => Duration.from({}), RangeError));
  });
  describe('toString()', () => {
    it('excessive sub-second units balance themselves when serializing', () => {
      equal(`${Duration.from({ milliseconds: 3500 })}`, 'PT3.500S');
      equal(`${Duration.from({ microseconds: 3500 })}`, 'PT0.003500S');
      equal(`${Duration.from({ nanoseconds: 3500 })}`, 'PT0.000003500S');
      equal(`${new Duration(0, 0, 0, 0, 0, 0, 1111, 1111, 1111, 'reject')}`, 'PT1.112112111S');
      equal(`${Duration.from({ seconds: 120, milliseconds: 3500 })}`, 'PT123.500S');
    });
  });
  describe('min/max values', () => {
    const units = ['years', 'months', 'days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds'];
    it('minimum is zero', () => {
      equal(`${new Duration(0, 0, 0, 0, 0, 0, 0, 0, 0, 'reject')}`, 'PT0S');
      units.forEach((unit) => equal(`${Duration.from({ [unit]: 0 })}`, 'PT0S'));
      ['P0Y', 'P0M', 'P0D', 'PT0H', 'PT0M', 'PT0S'].forEach((str) =>
        equal(`${Duration.from(str)}`, 'PT0S'));
    });
    it('infinity is not allowed', () => {
      units.forEach((unit, ix) => {
        throws(() => new Duration(...Array(ix).fill(0), Infinity, ...Array(8 - ix).fill(0), 'reject'));
        throws(() => Duration.from({ [unit]: Infinity }));
      });
    });
    it('unrepresentable number is not allowed', () => {
      units.forEach((unit, ix) => {
        throws(() => new Duration(...Array(ix).fill(0), 1e309, ...Array(8 - ix).fill(0), 'reject'));
        throws(() => Duration.from({ [unit]: 1e309 }));
      });
      const manyNines = '9'.repeat(309);
      [
        `P${manyNines}Y`, `P${manyNines}M`, `P${manyNines}D`, `PT${manyNines}H`,
        `PT${manyNines}M`, `PT${manyNines}S`,
      ].forEach((str) => throws(() => Duration.from(str)));
    });
    it('max safe integer is allowed', () => {
      [
        'P9007199254740991Y', 'P9007199254740991M', 'P9007199254740991D',
        'PT9007199254740991H', 'PT9007199254740991M', 'PT9007199254740991S',
        'PT9007199254740.991S', 'PT9007199254.740991S', 'PT9007199.254740991S'
      ].forEach((str, ix) => {
        equal(`${new Duration(...Array(ix).fill(0), Number.MAX_SAFE_INTEGER, ...Array(8 - ix).fill(0), 'reject')}`, str);
        equal(`${Duration.from({ [units[ix]]: Number.MAX_SAFE_INTEGER })}`, str);
        equal(`${Duration.from(str)}`, str);
      });
    });
    it('larger integers are allowed but may lose precision', () => {
      function test(ix, prefix, suffix, infix = '') {
        function doAsserts(duration) {
          const str = duration.toString();
          equal(str.slice(0, prefix.length + 10), `${prefix}1000000000`);
          assert(str.includes(infix));
          equal(str.slice(-1), suffix);
          equal(str.length, prefix.length + suffix.length + infix.length + 27);
        }
        doAsserts(new Duration(...Array(ix).fill(0), 1e26, ...Array(8 - ix).fill(0), 'reject'));
        doAsserts(Duration.from({ [units[ix]]: 1e26 }));
        if (!infix) doAsserts(Duration.from(`${prefix}100000000000000000000000000${suffix}`));
      }
      test(0, 'P', 'Y');
      test(1, 'P', 'M');
      test(2, 'P', 'D');
      test(3, 'PT', 'H');
      test(4, 'PT', 'M');
      test(5, 'PT', 'S');
      test(6, 'PT', 'S', '.');
      test(7, 'PT', 'S', '.');
      test(8, 'PT', 'S', '.');
    });
  });
});

import { normalize } from 'path';
if (normalize(import.meta.url.slice(8)) === normalize(process.argv[1])) {
  report(reporter).then((failed) => process.exit(failed ? 1 : 0));
}
