* APU-X Analog Crossbar Cell — Thermal Noise Analysis
* Purpose: Validate Theorem 6.4 / Lemma 6.5 (Vnoise << VLSB)
.param T=300 Rcell=1k kB=1.38e-23
.param VLSB={1.0/1024}

* LTspice automatically includes Johnson noise for resistors based on Temp
R1 in out {Rcell}
Vcell in 0 DC 0.5 AC 1

* Noise analysis from 1Hz to 1MHz, 100 points per decade
.noise V(out) Vcell dec 100 1 1e6

* Measure total RMS noise and expected LSB voltage
.meas NOISE noise_rms INTEG V(out)
.meas NOISE expected_VLSB param {VLSB}

.end
