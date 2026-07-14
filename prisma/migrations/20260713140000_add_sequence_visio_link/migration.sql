-- Videoconference link for a séquence's lieu, so a DISTANCIEL convocation can
-- carry a real "connect here" URL instead of nothing.

ALTER TABLE "Sequence" ADD COLUMN "visioLink" TEXT;
