# Northcurve

Probabilistic market intelligence for major global assets.

Each day, Northcurve estimates for key financial assets:

- the probability of upside
- the expected performance potential
- the likely path between now and the selected horizon
- the path risk before target

This repository currently contains the first premium landing page prototype for the product concept.

## Positioning

Northcurve is not another indicator dashboard.

It is a scenario engine designed to answer the questions investors actually ask:

- What are the chances that this asset goes up?
- How far could it go on this horizon?
- What drawdown could happen before the move plays out?
- What is the most likely path from here?

## Current Scope

The current version includes:

- a premium landing page built with Next.js App Router
- a visual mockup for rapid review
- a first product narrative centered on probabilities, upside, and path

## Project Structure

```text
app/
  globals.css        Global styles and visual system
  layout.js          Root layout
  page.js            Landing page
public/
  mockup.svg         Static visual mockup
docs/
  probabilitedehausse.md   Product concept and positioning note
```

## Product Thesis

The product is built around a simple promise:

> We estimate, for major global assets, the probability of upside across multiple horizons, the potential performance, and the most likely market path between now and that horizon.

The differentiation does not come from raw indicators.

It comes from transforming market and macro signals into decision-ready probabilistic outputs.

## Target Output Per Asset

For each asset and horizon, the product should ultimately expose:

- upside probability
- central expected return
- optimistic scenario
- expected path
- probable drawdown before target
- confidence level

## Intended Users

- private investors
- advisors and allocators
- family offices
- macro and cross-asset analysts
- investment teams looking for a daily synthetic view

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

## Next Steps

- connect the form to a real waitlist backend
- refine brand identity and naming
- add motion and richer product preview states
- introduce real data mocks for multiple asset classes
- define the first version of the probability engine

## Notes

The repository does not yet include live market data integration, model logic, or a production backend.

This stage is focused on product framing, visual direction, and landing page validation.
