import sys
from swmm.toolkit import solver

def main():
    if len(sys.argv) != 4:
        print("Usage: run_swmm.py <inp_path> <rpt_path> <out_path>", file=sys.stderr)
        sys.exit(1)

    inp_path = sys.argv[1]
    rpt_path = sys.argv[2]
    out_path = sys.argv[3]

    try:
        solver.swmm_open(inp_path, rpt_path, out_path)
        solver.swmm_start(True)

        while True:
            elapsed = solver.swmm_step()
            if elapsed == 0:
                break

        solver.swmm_end()
        solver.swmm_close()
        print("Simulation completed successfully")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        try:
            solver.swmm_end()
            solver.swmm_close()
        except:
            pass
        sys.exit(1)

if __name__ == "__main__":
    main()
