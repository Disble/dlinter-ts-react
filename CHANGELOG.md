# Changelog

## [0.5.0](https://github.com/Disble/dlinter-ts-react/compare/dlinter-ts-react-v0.4.1...dlinter-ts-react-v0.5.0) (2026-07-13)


### Features

* **cli:** add RunnerAdapter registry for bun/pnpm/yarn/npm ([5531fb4](https://github.com/Disble/dlinter-ts-react/commit/5531fb49c12ad4d0c3f4284c90a9ba0f127d1a1a))
* **cli:** add StackProfile registry for wails/nextjs/react-native/react-spa/ts-lib ([ad3cfc2](https://github.com/Disble/dlinter-ts-react/commit/ad3cfc24a9ef72a04b2da9624abb81c6e75ba8ba))
* **cli:** additively merge dlinter jobs into existing lefthook.yml ([65e3923](https://github.com/Disble/dlinter-ts-react/commit/65e39232226b2794ab9eb9366e92e9f5d69ae4bf))
* **cli:** compose detect(cwd, override?) from runners + profiles ([6e855ad](https://github.com/Disble/dlinter-ts-react/commit/6e855ad209eef777fec8045a5922f8c759afd38e))
* **cli:** reconcile RenderedArtifacts onto disk with never-overwrite writer ([be9600c](https://github.com/Disble/dlinter-ts-react/commit/be9600cc2cbc27e167cbc5f71cebaf6b2bda4fe1))
* **cli:** render ProjectPlan into lefthook jobs and fallow templates ([d74777b](https://github.com/Disble/dlinter-ts-react/commit/d74777bd02a24459a0dd3b9f9547e322bceb8cf7))
* **cli:** wire detect-&gt;render-&gt;write into runInit with --profile support ([aa87979](https://github.com/Disble/dlinter-ts-react/commit/aa879796a8c8d12d0a3f909714344e7f545d62f2))


### Bug Fixes

* **cli:** consult prior-owned job names when merging lefthook jobs ([eaa1d86](https://github.com/Disble/dlinter-ts-react/commit/eaa1d86178b85491407570a6acb3311d2c5539fe))
* **cli:** detect the bin entrypoint through symlinks so init runs under npm ([f17b41e](https://github.com/Disble/dlinter-ts-react/commit/f17b41e1d85bb51e07a4ba272883ba3969d064c3))
* **cli:** read .dlinter-init.json back so state-file ownership survives ([86e5bce](https://github.com/Disble/dlinter-ts-react/commit/86e5bce606ab991ad2227195d974866074a1bf41))

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
