# Changelog

## [0.4.1](https://github.com/Disble/dlinter-ts-react/compare/dlinter-ts-react-v0.4.0...dlinter-ts-react-v0.4.1) (2026-07-12)


### Bug Fixes

* **recommended:** stop hook glob leaking strict-colocation onto *.types.ts role files ([#11](https://github.com/Disble/dlinter-ts-react/issues/11)) ([fa3df67](https://github.com/Disble/dlinter-ts-react/commit/fa3df67eac6951ca8015515111fe2c5a86f55372))

## [0.4.0](https://github.com/Disble/dlinter-ts-react/compare/dlinter-ts-react-v0.3.1...dlinter-ts-react-v0.4.0) (2026-07-12)


### Features

* **recommended:** respect upstream plugin severities and enable type-checked linting ([f49bca6](https://github.com/Disble/dlinter-ts-react/commit/f49bca67a3539391f98b5fe33b235d3e7d47605f))


### Bug Fixes

* **sonar:** remediate workflow and lint findings ([389cf7d](https://github.com/Disble/dlinter-ts-react/commit/389cf7d93744a18147aecbb145cb0e4c505294c1))

## [0.3.1](https://github.com/Disble/dlinter-ts-react/compare/dlinter-ts-react-v0.3.0...dlinter-ts-react-v0.3.1) (2026-07-11)


### Bug Fixes

* **scripts:** support npm 12 object output in pack e2e gate ([48388f6](https://github.com/Disble/dlinter-ts-react/commit/48388f69886b833a1a85e170ad6aa0e1ecb0a409))

## [0.3.0](https://github.com/Disble/dlinter-ts-react/compare/dlinter-ts-react-v0.2.0...dlinter-ts-react-v0.3.0) (2026-07-11)


### Features

* **recommended:** flag root-level constants in helpers role files ([5e46939](https://github.com/Disble/dlinter-ts-react/commit/5e46939727e9b5aae3e13196763383f28d41ccdd))


### Bug Fixes

* **strict-colocation:** treat specifier-exported root functions as main modules ([864562f](https://github.com/Disble/dlinter-ts-react/commit/864562fcd36bec664e840dae91464e0e52a1a302))

## [0.2.0](https://github.com/Disble/dlinter-ts-react/compare/dlinter-ts-react-v0.1.0...dlinter-ts-react-v0.2.0) (2026-07-11)


### Features

* add pure-index-barrel and folder-ownership rules to recommended preset ([e8d0334](https://github.com/Disble/dlinter-ts-react/commit/e8d033447a14dd2117fd946cfec4867b4df383a4))
* bootstrap eslint plugin with architecture rules, recommended preset, and cli ([c0c08bc](https://github.com/Disble/dlinter-ts-react/commit/c0c08bc8cca2759e53e3f693583ea3f982608d7a))
* prepare npm publish with tarball e2e gate, ci pipeline, and first-class readme ([77451ac](https://github.com/Disble/dlinter-ts-react/commit/77451ac2527ef6ffeb11b0fec4655c55ac75046e))


### Bug Fixes

* flag every unexported root-level function as misplaced helper in strict-colocation ([70746bb](https://github.com/Disble/dlinter-ts-react/commit/70746bb445f315a0d289c0c657ceed2541eaa8dd))
