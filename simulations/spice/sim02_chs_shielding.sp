* CHS Shielding: Mutual Inductive Coupling with/without Graphene sleeve
* Purpose: Validate Theorem 6.3 - mutual inductive noise < VLSB

* Transient Source (High dI/dt pulse representing write current)
Vsource in1 0 PULSE(0 1 0 1n 1n 5n 10n)

* Unshielded Case (k = 0.01)
L1 in1 out1 1n
L2 in2 out2 1n
K12 L1 L2 0.01
R1 out1 0 50
R2 out2 0 50
R_in2 in2 0 50

* Shielded Case (k_shielded = 0.01 * 1e-5 = 1e-7)
Vsource2 in3 0 PULSE(0 1 0 1n 1n 5n 10n)
L3 in3 out3 1n
L4 in4 out4 1n
K34 L3 L4 1e-7
R3 out3 0 50
R4 out4 0 50
R_in4 in4 0 50

* Transient analysis: 100ps step, 50ns duration
.tran 100p 50n

* Measurements
.meas TRAN Vnoise_unshielded MAX V(out2) FROM=0 TO=50n
.meas TRAN Vnoise_shielded MAX V(out4) FROM=0 TO=50n

.end
