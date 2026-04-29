import argparse
import sys

from misjustice_crews.agents.factory import AgentFactory
from misjustice_crews.config.settings import settings
from misjustice_crews.crews.advocacy_crew import AdvocacyCrew
from misjustice_crews.crews.drafting_crew import DraftingCrew
from misjustice_crews.crews.intake_crew import IntakeCrew
from misjustice_crews.crews.research_crew import ResearchCrew
from misjustice_crews.crews.support_crew import SupportCrew

CREW_MAP = {
    "intake": IntakeCrew,
    "research": ResearchCrew,
    "drafting": DraftingCrew,
    "advocacy": AdvocacyCrew,
    "support": SupportCrew,
}


def cmd_run_crew(args):
    crew_cls = CREW_MAP.get(args.crew_name)
    if not crew_cls:
        print(f"Unknown crew: {args.crew_name}. Available: {', '.join(CREW_MAP)}", file=sys.stderr)
        sys.exit(1)
    crew = crew_cls().build()
    result = crew.kickoff(inputs={"matter_id": args.matter_id or "unknown"})
    print(result)


def cmd_list_agents(_args):
    factory = AgentFactory()
    for aid in factory.list_agents():
        print(aid)


def cmd_list_crews(_args):
    for name in CREW_MAP:
        print(name)


def cmd_validate_config(_args):
    errors = []
    if not settings.litellm_proxy_url:
        errors.append("LITELLM_PROXY_URL not set")
    if not settings.litellm_api_key:
        errors.append("LITELLM_API_KEY not set")
    if not settings.mcas_api_url:
        errors.append("MCAS_API_URL not set")
    if errors:
        print("Config validation FAILED:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(1)
    print("Config validation PASSED")


def cmd_run_bridge(args):
    import uvicorn
    uvicorn.run(
        "misjustice_crews.bridge.server:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


def main():
    parser = argparse.ArgumentParser(description="Misjustice Crews Orchestrator")
    sub = parser.add_subparsers(dest="command", required=True)

    run_p = sub.add_parser("run-crew", help="Run a crew for a matter")
    run_p.add_argument("crew_name", choices=list(CREW_MAP))
    run_p.add_argument("--matter-id", default="")
    run_p.set_defaults(func=cmd_run_crew)

    sub.add_parser("list-agents", help="List all registered agents").set_defaults(func=cmd_list_agents)
    sub.add_parser("list-crews", help="List all crews").set_defaults(func=cmd_list_crews)
    sub.add_parser("validate-config", help="Validate orchestrator configuration").set_defaults(func=cmd_validate_config)

    bridge_p = sub.add_parser("bridge", help="Run the crewAI bridge HTTP server")
    bridge_p.add_argument("--host", default="0.0.0.0")
    bridge_p.add_argument("--port", type=int, default=8002)
    bridge_p.add_argument("--reload", action="store_true", default=False)
    bridge_p.set_defaults(func=cmd_run_bridge)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
