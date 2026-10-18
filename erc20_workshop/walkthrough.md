# ERC-20 Workshop walkthrough

This note is for reviewers. It is not copied into the challenge image.

The player uses a funded Hardhat account on chain 31337.

1. Call `claim()` on WorkshopToken. The caller receives 100 WORK, and a second claim reverts.
2. Call `approve(collectorAddress, 25000000000000000000)` on WorkshopToken. That raw amount is exactly 25 tokens with 18 decimals.
3. Call `collect()` on Collector. Collector checks that the allowance is exactly 25 WORK, then calls `transferFrom` to pull those tokens.

`collect()` reverts when the allowance is missing, smaller, or larger. Sending tokens with `transfer` increases the collector's token balance and leaves `solved` false. After the exact sequence, `Collector.solved()` is true and the solve API returns the flag.

The flag is stored only in `challenge/flag.txt`.
