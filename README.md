# Charge Alerts Pi Config

Sets up a Pi5 as a Noisebridge charge alerts kiosk display driver.

## Prerequisites

- Ansible installed on your local machine
- SSH access to the target Pi as user `noisebridge`

## Usage

Provision a host:

```bash
cd ansible
ansible-playbook provision.yml --ask-vault-pass --limit charge-alerts2
```

Dry run (check mode):

```bash
cd ansible
ansible-playbook provision.yml --ask-vault-pass --limit charge-alerts2 --check --diff
```

## Adding a new host

Add an entry to `ansible/inventory.yml`:

```yaml
all:
  children:
    kiosks:
      hosts:
        # ...
        charge-alertsN:
          ansible_host: charge-alertsN.local
```
