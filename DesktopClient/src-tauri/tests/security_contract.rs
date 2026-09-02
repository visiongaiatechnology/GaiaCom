// STATUS: PLATIN
use serde_json::Value;

const CONFIGURATION: &str = include_str!("../tauri.conf.json");
const CAPABILITIES: &str = include_str!("../capabilities/default.json");

#[test]
fn native_client_preserves_the_hardened_runtime_contract() -> Result<(), serde_json::Error> {
    let configuration: Value = serde_json::from_str(CONFIGURATION)?;
    let csp = configuration["app"]["security"]["csp"].as_str();

    assert_eq!(configuration["identifier"], "net.gaiacom.desktop");
    assert_eq!(configuration["build"]["devUrl"], "http://127.0.0.1:3000");
    assert_eq!(configuration["app"]["windows"][0]["title"], "GaiaCom - AstraeaOS");
    assert_eq!(configuration["app"]["windows"][0]["minWidth"], 1024);
    assert_eq!(configuration["app"]["windows"][0]["minHeight"], 700);
    assert!(csp.is_some_and(|policy| policy.contains("default-src 'self'")));
    assert!(csp.is_some_and(|policy| policy.contains("object-src 'none'")));
    assert!(csp.is_some_and(|policy| policy.contains("frame-ancestors 'none'")));
    assert!(csp.is_some_and(|policy| policy.contains("wss://beta.gaiacom.de")));
    assert!(!csp.is_some_and(|policy| policy.contains("'unsafe-eval'")));
    assert!(!csp.is_some_and(|policy| policy.contains("script-src 'self' 'unsafe-inline'")));

    Ok(())
}

#[test]
fn webview_exposes_no_native_command_capabilities() -> Result<(), serde_json::Error> {
    let capabilities: Value = serde_json::from_str(CAPABILITIES)?;
    let permissions = capabilities["permissions"].as_array();

    assert!(permissions.is_some_and(Vec::is_empty));
    assert_eq!(capabilities["windows"][0], "main");

    Ok(())
}

#[test]
fn security_headers_remain_enabled() -> Result<(), serde_json::Error> {
    let configuration: Value = serde_json::from_str(CONFIGURATION)?;
    let headers = &configuration["app"]["security"]["headers"];

    assert_eq!(headers["Cross-Origin-Opener-Policy"], "same-origin");
    assert_eq!(headers["Cross-Origin-Resource-Policy"], "same-origin");
    assert_eq!(headers["X-Content-Type-Options"], "nosniff");

    Ok(())
}
