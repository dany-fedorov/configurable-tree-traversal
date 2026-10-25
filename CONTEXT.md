# CTT graph exploration language

This glossary records the language agreed for general graph exploration. It does not establish that the proposed graph-walking API is implemented.

## Language

**Walking edge**:
A directed relationship between two vertices, carrying caller-owned relationship data. Distinct edges may have the same endpoints; a walking edge does not itself impose work or completion requirements.
_Avoid_: Prerequisite, structural child (unless that is the relationship explicitly being explored).

**Occurrence**:
A particular appearance of a root or followed relationship along an explored route. Multiple occurrences can refer to the same vertex or edge, and one occurrence can support several observations.
_Avoid_: Duplicate vertex, emitted record.

**Revisit policy**:
The rule deciding whether a reached vertex may expand again along another route or repeat within the same route. It is independent of which observations a caller consumes.
_Avoid_: Result mode.

**Observation**:
A vertex, relationship, or path-prefix fact exposed during exploration. Selecting observations does not itself change which routes are explored.
_Avoid_: Work completion.

**Simple path**:
A route whose vertices do not repeat. Separate paths may share vertices and edges.
_Avoid_: Unique-vertex traversal.

**Walk**:
A route that may revisit vertices or edges. General graph walking also names the exploration activity that can produce vertices, edges, or route occurrences.
_Avoid_: Workflow execution.

**Path prefix**:
A route from an exploration root to the current vertex, including the zero-edge route at a root. A prefix need not end at a leaf.
_Avoid_: Complete path, terminal path.
