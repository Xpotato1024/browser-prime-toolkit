# Reviewed msieve subset
Source: https://github.com/radii/msieve
Commit: c8727d91305bdbe0972d160ef0ce61dd02ce9193.
Original and imported file hashes and sizes: [provenance.json](provenance.json).

Every imported source file carries Jason Papadopoulos's public-domain dedication.
Original notices are preserved; util.h CRLF lines are normalized to LF with
both hashes recorded. No license is granted for our
own code by this import. No upstream binary or build script is executed.

Only tiny MPQS, its arithmetic and prime table are compiled. No GMP, full SIQS,
ECM, NFS, filesystem or upstream driver is linked.
The build uses our [compatibility header](../../native/tinyqs/common.h) and
[checkpoint patch list](../../native/tinyqs/patches.json), applied to a temporary
copy with exact occurrence assertions. Arithmetic routines are not rewritten.
